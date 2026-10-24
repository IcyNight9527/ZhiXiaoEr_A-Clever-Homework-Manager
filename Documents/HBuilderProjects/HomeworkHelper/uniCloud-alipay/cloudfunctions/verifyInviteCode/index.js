const db = uniCloud.database()

// 允许的邀请码（写在云函数里，前端看不到）
const VALID_CODES = ['49']

// 频率限制：每个用户每分钟最多 3 次
const RATE_LIMIT = 3
const RATE_WINDOW = 60 * 1000  // 60 秒

exports.main = async (event, context) => {
	const { code, user_id } = event

	if (!code || !user_id) {
		return { code: 400, msg: '参数不完整' }
	}

	try {
		// 1. 查这个用户最近的验证记录
		const now = Date.now()
		const logRes = await db.collection('invite_code_logs')
			.where({
				user_id: user_id,
				created_at: db.command.gt(now - RATE_WINDOW)
			})
			.get()

		// 2. 频率限制
		if (logRes.data.length >= RATE_LIMIT) {
			return { code: 429, msg: '操作过于频繁，请 1 分钟后再试' }
		}

		// 3. 记录本次尝试
		await db.collection('invite_code_logs').add({
			user_id: user_id,
			code: code,
			success: VALID_CODES.includes(code),
			created_at: now
		})

		// 4. 校验邀请码
		if (!VALID_CODES.includes(code)) {
			return { code: 403, msg: '激活码不正确，请联系开发者获取' }
		}

		return { code: 200, msg: '验证通过' }

	} catch (e) {
		console.error('验证失败：', e)
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
