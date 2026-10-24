const db = uniCloud.database()

exports.main = async (event, context) => {
	const { group_id, creator_id, target_user_id, action } = event

	if (!group_id || !creator_id || !target_user_id) {
		return { code: 400, msg: '参数不完整' }
	}

	try {
		// 1. 查群组
		const gRes = await db.collection('groups').doc(group_id).get()
		if (gRes.data.length === 0) return { code: 404, msg: '群组不存在' }
		const group = gRes.data[0]

		// 2. 校验操作者是创建者
		if (group.admin_id !== creator_id) {
			return { code: 403, msg: '只有创建者才能任命管理员' }
		}

		// 3. 不能任命自己
		if (target_user_id === creator_id) {
			return { code: 400, msg: '无需任命自己' }
		}

		// 4. 查目标成员是否在群里
		const ugRes = await db.collection('user_groups').where({
			group_id: group_id,
			user_id: target_user_id
		}).get()

		if (ugRes.data.length === 0) {
			return { code: 404, msg: '该成员不在本群组中' }
		}

		// 5. 更新 is_admin
		const newIsAdmin = action === 'remove' ? false : true
		await db.collection('user_groups').doc(ugRes.data[0]._id).update({
			is_admin: newIsAdmin
		})

		return {
			code: 200,
			msg: newIsAdmin ? '任命成功！' : '已撤销管理员',
			data: { is_admin: newIsAdmin }
		}

	} catch (e) {
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
