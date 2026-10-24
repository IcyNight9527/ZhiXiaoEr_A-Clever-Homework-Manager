const db = uniCloud.database()

exports.main = async (event, context) => {
	// 1. 接收参数（新增 group_id）
	const { content, homework_id, type = 'common', group_id } = event

	// 2. 基础校验
	if (!content) {
		return { code: 400, msg: '通知内容不能为空' }
	}
	if (!group_id) {
		return { code: 400, msg: '缺少群组ID' }
	}

	try {
		// 3. 写入 notifications 表（新增 group_id 字段）
		const res = await db.collection('notifications').add({
			content: content,
			homework_id: homework_id || '',
			type: type,
			group_id: group_id,
			created_at: Date.now()
		})

		return {
			code: 200,
			msg: '通知发布成功！',
			data: { id: res.id }
		}

	} catch (e) {
		console.error('发布通知失败：', e)
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
