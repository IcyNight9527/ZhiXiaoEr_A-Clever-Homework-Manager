const db = uniCloud.database()

exports.main = async (event, context) => {
	// 1. 接收 group_id
	const { group_id } = event

	if (!group_id) {
		return { code: 400, msg: '缺少群组ID' }
	}

	try {
		// 2. 只查这个群组的通知
		const res = await db.collection('notifications')
			.where({ group_id: group_id })
			.orderBy('created_at', 'desc')
			.get()

		return { code: 200, msg: '获取成功', data: res.data }

	} catch (e) {
		console.error('获取通知失败：', e)
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
