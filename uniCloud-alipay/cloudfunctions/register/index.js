const db = uniCloud.database() //引入数据库操作对象
const crypto = require('crypto') //引入node.js内置加密模块

function md5(str) {
	return crypto.createHash('md5').update(str).digest('hex')
} //加密函数，输入字符串返回加密后的乱码

exports.main = async (event, context) => {
	const { userId, password, name, role = 'student' } = event //前端调用云函数时参数会传进event

	if (!userId || !password || !name) {
		return { code: 400, msg: '请填写完整的注册信息（账号、密码、姓名）' }
	}

	try {
		const checkUser = await db.collection('users').where({ userId: userId }).get()
		//去users数据库里查前端输入是否与数据库对应

		if (checkUser.data.length > 0) {
			return { code: 409, msg: '该学号或账号已被注册，请直接登录' }
		}

		const res = await db.collection('users').add({
			userId: userId,
			password: md5(password),
			name: name,
			role: role
		})

		return {
			code: 200,
			msg: '注册成功！',
			data: { id: res.id }
		}

	} catch (e) {
		console.error('注册失败：', e)
		return { code: 500, msg: '服务器内部错误，注册失败', error: e.message }
	}
}
