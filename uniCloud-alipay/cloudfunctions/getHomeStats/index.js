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

		// 👇 新增：找出“我是管理员且不需要交作业”的群组ID
		const excludeGroupIds = ugRes.data
			.filter(item => item.is_admin === true && item.admin_in_group === false)
			.map(item => item.group_id)

		// 2. 查这些群组里“需要提交”的作业
		const hwRes = await db.collection('homeworks').where({
			group_id: dbCmd.in(groupIds),
			need_submit: dbCmd.neq(false)
		}).get()

		// 👇 新增：过滤掉免交群组的作业
		const allHomeworks = hwRes.data.filter(hw => !excludeGroupIds.includes(hw.group_id))

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

		// 👇 筛选出快截止的作业（剩余时间 <= 1小时）
		const urgentList = pendingList.filter(hw => {
			const timeLeft = hw.deadline - Date.now()
			return timeLeft > 0 && timeLeft <= 60 * 60 * 1000
		})

		let urgentMsg = ''
		if (urgentList.length > 0) {
			const names = urgentList.map(hw => `《${hw.subject}》${hw.title}`).join('\n')
			urgentMsg = `智小二提醒您，如下作业剩余提交时间不足一小时，请尽快提交：\n${names}`
		}

		return {
			code: 200,
			msg: '获取成功',
			data: {
				pendingCount: pendingList.length,
				urgentMsg: urgentMsg
			}
		}

	} catch (e) {
		console.error('获取统计失败：', e)
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
