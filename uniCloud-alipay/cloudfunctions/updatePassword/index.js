const db = uniCloud.database()
const crypto = require('crypto')

function md5(str) {
	return crypto.createHash('md5').update(str).digest('hex')
}

exports.main = async (event, context) => {
	const { userId, oldPassword, newPassword } = event

	if (!userId || !oldPassword || !newPassword) {
		return { code: 400, msg: '请填写完整信息' }
	}
	if (newPassword.length < 6) {
		return { code: 400, msg: '新密码至少6位' }
	}

	try {
		// 1. 查用户
		const res = await db.collection('users').where({ userId: userId }).get()
		if (res.data.length === 0) {
			return { code: 404, msg: '用户不存在' }
		}

		const user = res.data[0]

		// 2. 校验旧密码
		if (user.password !== md5(oldPassword)) {
			return { code: 401, msg: '旧密码错误' }
		}

		// 3. 更新新密码
		await db.collection('users').doc(user._id).update({
			password: md5(newPassword)
		})

		return { code: 200, msg: '密码修改成功！' }

	} catch (e) {
		console.error('修改密码失败：', e)
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
