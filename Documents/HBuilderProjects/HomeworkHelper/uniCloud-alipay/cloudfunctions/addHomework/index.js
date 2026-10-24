const db = uniCloud.database()

exports.main = async (event, context) => {
	const { subject, desc, deadline, group_id, rename_rule, need_submit, images, file_url, file_name } = event

	if (!subject || !desc || !deadline || !group_id) {
		return { code: 400, msg: '请填写完整信息' }
	}

	try {
		const res = await db.collection('homeworks').add({
			subject,
			title: desc,
			desc,
			allowed_ext: ['pdf'],
			deadline,
			group_id,
			rename_rule: rename_rule || 'id_name',
			need_submit: need_submit !== false,
			images: images || [],
			file_url: file_url || '',
			file_name: file_name || '',
			created_at: Date.now()
		})

		await db.collection('notifications').add({
			content: `管理员发布了 ${subject} 的作业，请及时查看！`,
			group_id: group_id,
			homework_id: res.id,
			type: 'homework_add',
			created_at: Date.now()
		})

		return { code: 200, msg: '作业发布成功！', data: { id: res.id } }

	} catch (e) {
		console.error('发布作业失败：', e)
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
