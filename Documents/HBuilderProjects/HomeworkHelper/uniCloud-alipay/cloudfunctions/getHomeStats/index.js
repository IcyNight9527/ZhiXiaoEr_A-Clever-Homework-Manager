const db = uniCloud.database()
const dbCmd = db.command

exports.main = async (event, context) => {
	const { user_id } = event
	if (!user_id) return { code: 400, msg: '缺少用户ID' }

	try {
		// 1. 查我加入的所有群组
		const ugRes = await db.collection('user_groups').where({ user_id }).get()
		if (ugRes.data.length === 0) {
			return { code: 200, msg: '获取成功', data: { pendingCount: 0 } }
		}
		const groupIds = ugRes.data.map(item => item.group_id)

		// 2. 查这些群组里“需要提交”的作业
		const hwRes = await db.collection('homeworks').where({
			group_id: dbCmd.in(groupIds),
			need_submit: dbCmd.neq(false)
		}).get()
		const allHomeworks = hwRes.data

		if (allHomeworks.length === 0) {
			return { code: 200, msg: '获取成功', data: { pendingCount: 0 } }
		}

		// 3. 查我所有的提交记录
		const subRes = await db.collection('submissions').where({ student_id: user_id }).get()
		const submittedHwIds = subRes.data.map(s => s.homework_id)

		// 4. 算“待提交”：需要提交 + 未提交 + 未截止
		const pendingList = allHomeworks.filter(hw => {
			return !submittedHwIds.includes(hw._id) && Date.now() <= hw.deadline
		})

		return {
			code: 200,
			msg: '获取成功',
			data: { pendingCount: pendingList.length }
		}

	} catch (e) {
		console.error('获取统计失败：', e)
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
