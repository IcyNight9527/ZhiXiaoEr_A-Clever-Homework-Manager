const db = uniCloud.database()

exports.main = async (event, context) => {
	const {
	    homework_id, user_id, group_id,
	    subject, desc, allowed_ext, deadline,
	    rename_rule, need_submit,
	    images, file_url, file_name
	} = event

	if (!homework_id || !user_id || !group_id) {
		return { code: 400, msg: '参数不完整' }
	}

	try {
		// 1. 校验操作者是管理员
		const ugRes = await db.collection('user_groups').where({
			user_id, group_id
		}).get()
		if (ugRes.data.length === 0 || !ugRes.data[0].is_admin) {
			return { code: 403, msg: '你没有权限编辑作业' }
		}

		// 2. 查作业是否存在
		const hwRes = await db.collection('homeworks').doc(homework_id).get()
		if (hwRes.data.length === 0) {
			return { code: 404, msg: '作业不存在' }
		}
		const oldHomework = hwRes.data[0]

		// 3. 更新作业字段
		const updateData = {}
		if (subject !== undefined) updateData.subject = subject
		if (desc !== undefined) {
			updateData.desc = desc
			updateData.title = desc    // 兼容旧字段
		}
		if (allowed_ext !== undefined) updateData.allowed_ext = allowed_ext
		if (deadline !== undefined) updateData.deadline = deadline
		if (rename_rule !== undefined) updateData.rename_rule = rename_rule
		if (need_submit !== undefined) updateData.need_submit = need_submit
		if (images !== undefined) updateData.images = images
		if (file_url !== undefined) updateData.file_url = file_url
		if (file_name !== undefined) updateData.file_name = file_name

		await db.collection('homeworks').doc(homework_id).update(updateData)

		// 4. 自动生成通知
		const finalSubject = subject || oldHomework.subject
		await db.collection('notifications').add({
			content: `管理员更新了 ${finalSubject} 的作业内容，请及时查看！`,
			group_id: group_id,
			homework_id: homework_id,
			type: 'homework_update',
			created_at: Date.now()
		})

		return { code: 200, msg: '作业已更新，并已发送通知' }

	} catch (e) {
		console.error('更新作业失败：', e)
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
