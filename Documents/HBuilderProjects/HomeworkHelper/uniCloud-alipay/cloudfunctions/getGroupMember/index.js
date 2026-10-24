const db = uniCloud.database()
const dbCmd = db.command

exports.main = async (event, context) => {
	const { group_id } = event
	if (!group_id) return { code: 400, msg: '缺少群组ID' }

	try {
		// 1. 查 user_groups 表里这个群组的所有成员
		const ugRes = await db.collection('user_groups').where({ group_id }).get()
		if (ugRes.data.length === 0) {
			return { code: 200, msg: '获取成功', data: [] }
		}

		// 2. 查这些用户的详细信息
		const userIds = ugRes.data.map(item => item.user_id)
		const userRes = await db.collection('users').where({ userId: dbCmd.in(userIds) }).get()

		// 3. 查群组信息（拿创建者 ID）
		const gRes = await db.collection('groups').doc(group_id).get()
		const creatorId = gRes.data.length > 0 ? gRes.data[0].admin_id : ''

		// 4. 合并信息
		const members = ugRes.data.map(ug => {
			const user = userRes.data.find(u => u.userId === ug.user_id)
			return {
				user_id: ug.user_id,
				name: user ? user.name : '未知',
				is_admin: ug.is_admin || false,
				admin_in_group: ug.admin_in_group || false,
				is_creator: ug.user_id === creatorId
			}
		})

		// 5. 排序：创建者 > 管理员 > 普通成员
		members.sort((a, b) => {
			if (a.is_creator) return -1
			if (b.is_creator) return 1
			if (a.is_admin && !b.is_admin) return -1
			if (!a.is_admin && b.is_admin) return 1
			return 0
		})

		return { code: 200, msg: '获取成功', data: members }

	} catch (e) {
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
