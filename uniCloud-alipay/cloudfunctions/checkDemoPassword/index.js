const db = uniCloud.database()

exports.main = async (event, context) => {
	const { user_id, password } = event
	if(!user_id || !password) return { code: 400, msg: '参数不完整' }

	try {
		const res = await db.collection('users').where({ userId: user_id }).get()
		if(res.data.length === 0) return { code: 404, msg: '用户不存在' }

		const dbPwd = res.data[0].demo_password
		if(!dbPwd) return { code: 400, msg: '您还未设置访客密码' }

		if(dbPwd !== password) {
			return { code: 403, msg: '激活码错误' }
		}
		return { code: 200, msg: '验证通过' }

	} catch(e) {
		return { code: 500, msg: '服务器错误', error: e.message }
	}
}
