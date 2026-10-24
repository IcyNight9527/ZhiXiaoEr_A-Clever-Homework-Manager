const db = uniCloud.database()

exports.main = async (event, context) => {
	const { notification_id, user_id, group_id } = event

	if (!notification_id || !user_id || !group_id) {
		return { code: 400, msg: '参数不完整' }
	}

	try {
		// 1. 校验：当前用户是不是这个群组的管理员
		const ugRes = await db.collection('user_groups').where({
			user_id: user_id,
			group_id: group_id
		}).get()

		if (ugRes.data.length === 0 || !ugRes.data[0].is_admin) {
			return { code: 403, msg: '你没有权限删除通知' }
		}

		// 2. 删除通知
		await db.collection('notifications').doc(notification_id).remove()

		return { code: 200, msg: '通知已删除' }

	} catch (e) {
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
