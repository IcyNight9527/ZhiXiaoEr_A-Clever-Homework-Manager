const db = uniCloud.database()

async function trimNotifications(groupId) {
	let deletedCount = 0

	while (true) {
		const res = await db.collection('notifications')
			.where({ group_id: groupId })
			.orderBy('created_at', 'desc')
			.limit(100)
			.get()

		if (res.data.length <= 3) {
			break
		}

		// 保留前三条，删除其余较早通知
		const expiredIds = res.data
			.slice(3)
			.map(item => item._id)

		if (expiredIds.length === 0) {
			break
		}

		await db.collection('notifications')
			.where({
				_id: db.command.in(expiredIds)
			})
			.remove()

		deletedCount += expiredIds.length

		// 本次不足100条，说明剩余数据已经查完
		if (res.data.length < 100) {
			break
		}
	}

	return deletedCount
}

exports.main = async (event, context) => {
	const {
		content,
		homework_id,
		type = 'common',
		group_id
	} = event

	if (!content) {
		return {
			code: 400,
			msg: '通知内容不能为空'
		}
	}

	if (!group_id) {
		return {
			code: 400,
			msg: '缺少群组ID'
		}
	}

	try {
		const res = await db.collection('notifications').add({
			content: content.trim(),
			homework_id: homework_id || '',
			type: type,
			group_id: group_id,
			created_at: Date.now()
		})

		let deletedCount = 0
		let trimSuccess = true

		try {
			deletedCount = await trimNotifications(group_id)
		} catch (trimError) {
			trimSuccess = false
			console.warn('通知已发布，但旧通知清理失败：', trimError)
		}

		return {
			code: 200,
			msg: '通知发布成功！',
			data: {
				id: res.id,
				deleted_count: deletedCount,
				trim_success: trimSuccess
			}
		}
	} catch (error) {
		console.error('发布通知失败：', error)

		return {
			code: 500,
			msg: '服务器内部错误'
		}
	}
}
