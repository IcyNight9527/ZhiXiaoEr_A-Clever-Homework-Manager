const db = uniCloud.database()
const dbCmd = db.command

exports.main = async (event, context) => {
	const { homework_id, group_id } = event

	if (!group_id) {
		return { code: 400, msg: '缺少群组ID' }
	}

	try {
		// 👇 新增：如果指定了作业且不需要提交，直接返回空统计
		if (homework_id) {
			const hwRes = await db.collection('homeworks').doc(homework_id).get()
			if (hwRes.data.length > 0 && hwRes.data[0].need_submit === false) {
				return {
					code: 200,
					msg: '该作业无需提交',
					data: {
						total: 0, submittedCount: 0, notSubmittedCount: 0,
						submittedList: [], notSubmittedList: [],
						need_submit: false
					}
				}
			}
		}

		// 1. 查这个群组的成员（从 user_groups 表）
		const ugRes = await db.collection('user_groups').where({ group_id: group_id }).get()
		const memberIds = ugRes.data
			.filter(item => !(item.is_admin && item.admin_in_group === false))
			.map(item => item.user_id)

		if (memberIds.length === 0) {
			return {
				code: 200,
				msg: '查询成功',
				data: {
					total: 0, submittedCount: 0, notSubmittedCount: 0,
					submittedList: [], notSubmittedList: []
				}
			}
		}

		// 2. 查这个群组的成员详细信息
		const studentRes = await db.collection('users').where({
			userId: dbCmd.in(memberIds)
		}).get()

		// 3. 查这个群组、这份作业的提交记录
		let query = { group_id: group_id }
		if (homework_id) query.homework_id = homework_id

		const submitRes = await db.collection('submissions')
			.where(query)
			.orderBy('submit_time', 'desc')
			.get()

		// 4. 算未交名单
		const submittedIds = submitRes.data.map(item => item.student_id)
		const notSubmitted = studentRes.data.filter(stu => !submittedIds.includes(stu.userId))

		return {
			code: 200,
			msg: '查询成功',
			data: {
				total: studentRes.data.length,
				submittedCount: submitRes.data.length,
				notSubmittedCount: notSubmitted.length,
				submittedList: submitRes.data,
				notSubmittedList: notSubmitted.map(s => ({ userId: s.userId, name: s.name }))
			}
		}

	} catch (e) {
		console.error('查询失败：', e)
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
