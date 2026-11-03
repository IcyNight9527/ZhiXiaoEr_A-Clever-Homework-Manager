const db = uniCloud.database()
const dbCmd = db.command

exports.main = async (event, context) => {
	const { user_id } = event
	if (!user_id) return { code: 400, msg: '缺少用户ID' }

	try {
		// 1. 查 user_groups，找出这个用户加入的所有记录
		const ugRes = await db.collection('user_groups').where({ user_id }).get()
		if (ugRes.data.length === 0) {
			return { code: 200, msg: '尚未加入任何群组', data: [] }
		}

		// 2. 提取 group_id
		const groupIds = ugRes.data.map(item => item.group_id)

		// 3. 查群组详情
		const groupRes = await db.collection('groups').where({
			_id: dbCmd.in(groupIds)
		}).get()

		// 4. 查每个群组的成员数
		const memberCounts = {}
		for (const g of groupRes.data) {
			const cntRes = await db.collection('user_groups').where({ group_id: g._id }).count()
			memberCounts[g._id] = cntRes.total
		}

		// 5. 合并身份 + 成员数
		const groups = groupRes.data.map(g => {
			const my = ugRes.data.find(u => u.group_id === g._id)
			return {
				...g,
				my_is_admin: my ? my.is_admin : false,
				my_admin_in_group: my ? my.admin_in_group : false,
				member_count: memberCounts[g._id] || 0    // 👈 新增
			}
		})

		return { code: 200, msg: '获取成功', data: groups }

	} catch (e) {
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
