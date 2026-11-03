const db = uniCloud.database()

exports.main = async (event, context) => {
	const { user_id } = event

	if (!user_id) {
		return { code: 400, msg: '缺少用户ID' }
	}

	try {
		// 1. 查用户的通行证等级
		const userRes = await db.collection('users').where({ userId: user_id }).get()
		if (userRes.data.length === 0) {
			return { code: 404, msg: '用户不存在' }
		}

		const user = userRes.data[0]
		const passLevel = user.pass_level || 'none'

		// 2. 查该用户已经建了几个群
		const countRes = await db.collection('groups').where({ admin_id: user_id }).count()

		return {
			code: 200,
			msg: '获取成功',
			data: {
				pass_level: passLevel,
				group_count: countRes.total
			}
		}

	} catch (e) {
		console.error('获取通行证信息失败：', e)
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
