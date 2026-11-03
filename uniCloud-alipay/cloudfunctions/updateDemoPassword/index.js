const db = uniCloud.database()

exports.main = async (event, context) => {
	const {
		user_id,
		action = 'update',
		old_demo_password = '',
		demo_password
	} = event

	if (typeof user_id !== 'string' || !user_id.trim()) {
		return { code: 400, msg: '缺少用户ID' }
	}

	if (action !== 'status' && action !== 'update') {
		return { code: 400, msg: '不支持的操作' }
	}

	try {
		// 1. 查用户是否存在
		const res = await db.collection('users')
			.where({ userId: user_id })
			.get()

		if (res.data.length === 0) {
			return { code: 404, msg: '用户不存在' }
		}

		const user = res.data[0]
		const hasPassword =
			typeof user.demo_password === 'string' &&
			user.demo_password.length > 0

		// 2. 只查询是否设置过，不返回激活码内容
		if (action === 'status') {
			return {
				code: 200,
				msg: '查询成功',
				data: {
					has_demo_password: hasPassword
				}
			}
		}

		// 3. 校验新激活码
		if (
			typeof demo_password !== 'string' ||
			!demo_password.trim()
		) {
			return { code: 400, msg: '新激活码不能为空' }
		}

		const newPassword = demo_password.trim()

		// 4. 已设置过激活码：必须验证旧码
		if (hasPassword) {
			if (
				typeof old_demo_password !== 'string' ||
				!old_demo_password.trim()
			) {
				return { code: 400, msg: '请输入旧访客激活码' }
			}

			if (user.demo_password !== old_demo_password.trim()) {
				return { code: 403, msg: '旧访客激活码错误' }
			}

			if (newPassword === user.demo_password) {
				return { code: 400, msg: '新激活码不能与旧激活码相同' }
			}
		}

		// 5. 更新时再次匹配读取到的旧值
		// 防止其他请求已修改激活码后，本次仍覆盖它
		const condition = { _id: user._id }

		if (user.demo_password === undefined) {
			condition.demo_password = db.command.exists(false)
		} else {
			condition.demo_password = user.demo_password
		}

		const updateRes = await db.collection('users')
			.where(condition)
			.update({
				demo_password: newPassword
			})

		if (updateRes.updated !== 1) {
			return {
				code: 409,
				msg: '激活码状态已变化，请重新操作'
			}
		}

		return {
			code: 200,
			msg: hasPassword ? '访客激活码修改成功' : '访客激活码设置成功'
		}
	} catch (e) {
		console.error('设置访客激活码失败：', e)
		return { code: 500, msg: '服务器错误，请稍后重试' }
	}
}
