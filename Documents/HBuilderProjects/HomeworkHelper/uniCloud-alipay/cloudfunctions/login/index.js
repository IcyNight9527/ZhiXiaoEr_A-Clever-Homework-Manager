const db = uniCloud.database()
const crypto = require('crypto')

// 定义 MD5 加密函数
function md5(str) {
	return crypto.createHash('md5').update(str).digest('hex')
}

exports.main = async (event, context) => {
	const { userId, password } = event

	if (!userId || !password) {
		return { code: 400, msg: '请输入账号和密码' }
	}

	try {
		const res = await db.collection('users').where({ userId: userId }).get()

		if (res.data.length === 0) {
			return { code: 404, msg: '账号不存在，请先注册' }
		}

		const userInfo = res.data[0]

		// 👇 关键：把用户输入的密码也 MD5 加密，再和数据库里的比对
		if (userInfo.password !== md5(password)) {
			return { code: 401, msg: '密码错误，请重新输入' }
		}

		return {
			code: 200,
			msg: '登录成功！',
			data: {
				userId: userInfo.userId,
				name: userInfo.name,
				role: userInfo.role
			}
		}

	} catch (e) {
		console.error('登录失败：', e)
		return { code: 500, msg: '服务器内部错误，登录失败', error: e.message }
	}
}
