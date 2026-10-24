const db = uniCloud.database()

exports.main = async (event, context) => {
	const { name, group_code, group_password, admin_id, admin_in_group } = event

	if (!name || !group_code || !group_password || !admin_id) {
		return { code: 400, msg: '请填写完整信息' }
	}
	if (!/^\d{4}$/.test(group_code)) {
		return { code: 400, msg: '群组号必须是4位数字' }
	}
	if (!/^\d{6}$/.test(group_password)) {
		return { code: 400, msg: '群组密码必须是6位数字' }
	}

	try {
		// 1. 检查群组号是否已被占用
		const checkRes = await db.collection('groups').where({ group_code: group_code }).get()
		if (checkRes.data.length > 0) {
			return { code: 409, msg: '该群组号已被占用，请换一个' }
		}

		// 2. 创建群组
		const res = await db.collection('groups').add({
			name: name,
			group_code: group_code,
			group_password: group_password,
			admin_id: admin_id,
			admin_in_group: admin_in_group === true,
			created_at: Date.now()
		})

		const groupId = res.id

		// 3. 创建者自动加入 user_groups
		await db.collection('user_groups').add({
			user_id: admin_id,
			group_id: groupId,
			is_admin: true,
			admin_in_group: admin_in_group === true,
			joined_at: Date.now()
		})

		return {
			code: 200,
			msg: '群组创建成功！',
			data: { group_id: groupId, group_code: group_code }
		}

	} catch (e) {
		console.error('创建群组失败：', e)
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
