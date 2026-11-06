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
		// 1. 查用户通行证等级
		const userRes = await db.collection('users').where({ userId: admin_id }).get()
		if (userRes.data.length === 0) {
			return { code: 404, msg: '用户不存在' }
		}
		const passLevel = userRes.data[0].pass_level || 'none'

		// 2. 查该用户已建群数量
		const countRes = await db.collection('groups').where({ admin_id: admin_id }).count()
		const currentCount = countRes.total

		// 3. 计算通行证配额
		let quota = 0
		if (passLevel === 'normal') quota = 1
		else if (passLevel === 'high') quota = 3
		else if (passLevel === 'unlimited') quota = 9999
		else quota = 0 // 也就是 none

		// 4. 拦截检查
		if (currentCount + 1 > quota) {
			return { code: 403, msg: '建群配额不足，请前往个人主页升级通行证' }
		}

		// 5. 检查群组号是否已被占用
		const checkRes = await db.collection('groups').where({ group_code: group_code }).get()
		if (checkRes.data.length > 0) {
			return { code: 409, msg: '该群组号已被占用，请换一个' }
		}

		// 6. 创建群组
		const res = await db.collection('groups').add({
			name: name,
			group_code: group_code,
			group_password: group_password,
			admin_id: admin_id,
			admin_in_group: admin_in_group === true,
			created_at: Date.now()
		})

		const groupId = res.id

		if (!groupId) {
			throw new Error('群组创建成功，但没有返回群组ID')
		}

		try {
			await db.collection('user_groups').add({
				user_id: admin_id,
				group_id: groupId,
				is_admin: true,
				admin_in_group: admin_in_group === true,
				joined_at: Date.now()
			})
		} catch (memberError) {
			console.error('创建者加入群组失败，开始回滚群组：', memberError)

			let rollbackSuccess = false

			try {
				await db.collection('groups')
					.doc(groupId)
					.remove()

				rollbackSuccess = true
			} catch (rollbackError) {
				console.error('群组回滚失败：', rollbackError)
			}

			return {
				code: 500,
				msg: rollbackSuccess
					? '创建群组失败，请重试'
					: '创建群组失败，请联系管理员处理',
				data: {
					rollback_success: rollbackSuccess
				}
			}
		}

		return {
			code: 200,
			msg: '群组创建成功！',
			data: {
				group_id: groupId,
				group_code: group_code
			}
		}

	} catch (e) {
		console.error('创建群组失败：', e)
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
