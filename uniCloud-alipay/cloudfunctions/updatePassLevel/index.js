const db = uniCloud.database()

exports.main = async (event, context) => {
	const { user_id, pass_code } = event

	if (!user_id || !pass_code) {
		return { code: 400, msg: '参数不完整' }
	}

	try {
		// 1. 定义合法的通行证码及其对应的等级
		const codeRes = await db.collection('pass_codes').where({
					code: pass_code,
					enabled: true // 确保这个码没被禁用
				}).get()

				// 2. 如果没查到，说明码不对
				if (codeRes.data.length === 0) {
					return { code: 403, msg: '通行证号码错误或已失效，请联系开发者获取' }
				}

				const targetLevel = codeRes.data[0].level

		// 3. 查用户是否存在
		const userRes = await db.collection('users').where({ userId: user_id }).get()
		if (userRes.data.length === 0) {
			return { code: 404, msg: '用户不存在' }
		}

		const user = userRes.data[0]

		// 4. 防止降级（如果用户已经是无限，输入高级码不要给他降级）
		const levelPriority = {
			'none': 0,
			'normal': 1,
			'high': 2,
			'unlimited': 3
		}
		const currentLevel = user.pass_level || 'none'

		if (levelPriority[targetLevel] <= levelPriority[currentLevel] && currentLevel !== 'none') {
			return { code: 400, msg: '您已拥有该通行证，无需重复激活' }
		}

		// 5. 更新用户的通行证等级
		await db.collection('users').doc(user._id).update({
			pass_level: targetLevel
		})

		return { code: 200, msg: '通行证激活成功！' }

	} catch (e) {
		console.error('激活通行证失败：', e)
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
