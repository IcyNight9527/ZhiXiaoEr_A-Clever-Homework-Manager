const db = uniCloud.database()
const crypto = require('crypto')

// 兼容目前账号密码的存储方式
function md5(str) {
	return crypto.createHash('md5').update(str).digest('hex')
}

// 数据库只保存登录凭证的哈希
function sha256(str) {
	return crypto.createHash('sha256').update(str).digest('hex')
}

exports.main = async (event, context) => {
	const { userId, password } = event

	if (
		typeof userId !== 'string' ||
		!userId ||
		typeof password !== 'string' ||
		!password
	) {
		return {
			code: 400,
			msg: '请输入账号和密码'
		}
	}

	try {
		// 1. 查询账号
		const res = await db.collection('users')
			.where({ userId })
			.limit(1)
			.get()

		const user = res.data[0]

		// 不区分账号不存在和密码错误，避免泄露账号是否存在
		if (!user || user.password !== md5(password)) {
			return {
				code: 401,
				msg: '账号或密码错误'
			}
		}

		// 2. 为本次登录生成独立凭证
		const token = crypto.randomBytes(32).toString('hex')

		const now = Date.now()
		const expiresAt = now + 7 * 24 * 60 * 60 * 1000

		// 3. 每次登录新增会话，不覆盖其他设备
		await db.collection('auth_sessions').add({
			token_hash: sha256(token),
			user_id: user.userId,
			created_at: now,
			expires_at: expiresAt
		})

		// 4. 返回用户信息和登录凭证
		return {
			code: 200,
			msg: '登录成功！',
			data: {
				userId: user.userId,
				name: user.name,
				role: user.role,
				auth_token: token,
				token_expires_at: expiresAt,
				pass_level: user.pass_level || 'none'
			}
		}
	} catch (e) {
		// 不打印密码或凭证
		console.error('登录失败：', e.message)

		return {
			code: 500,
			msg: '登录失败，请稍后重试'
		}
	}
}
