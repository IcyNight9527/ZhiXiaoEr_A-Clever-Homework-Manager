const db = uniCloud.database()

exports.main = async (event, context) => {
	const { group_id, user_id } = event
	if (!group_id || !user_id) return { code: 400, msg: '缺少参数' }

	try {
		// 1. 查群组
		const gRes = await db.collection('groups').doc(group_id).get()
		if (gRes.data.length === 0) return { code: 404, msg: '群组不存在' }
		const group = gRes.data[0]

		// 2. 查我在这个群里的身份
		const ugRes = await db.collection('user_groups').where({
			user_id: user_id,
			group_id: group_id
		}).get()

		if (ugRes.data.length === 0) {
			return { code: 403, msg: '你不在这个群组里' }
		}

		const my = ugRes.data[0]
		const isCreator = group.admin_id === user_id

		// 3. 群组信息：只有创建者能看到群组密码
		const groupInfo = {
			_id: group._id,
			name: group.name,
			group_code: group.group_code,
			admin_id: group.admin_id,
			admin_in_group: group.admin_in_group,
			created_at: group.created_at
		}
		if (isCreator) {
			groupInfo.group_password = group.group_password
		}

		return {
			code: 200,
			msg: '获取成功',
			data: {
				group: groupInfo,
				myIdentity: {
					is_admin: my.is_admin || false,
					admin_in_group: my.admin_in_group || false,
					is_creator: isCreator
				}
			}
		}

	} catch (e) {
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
