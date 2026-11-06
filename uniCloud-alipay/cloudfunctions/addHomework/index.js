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

		if (res.data.length < 100) {
			break
		}
	}

	return deletedCount
}

const SUPPORTED_EXTENSIONS = new Set([
	'pdf',
	'doc',
	'docx',
	'xls',
	'xlsx',
	'ppt',
	'pptx',
	'jpg',
	'jpeg',
	'png',
	'txt',
	'zip',
	'rar'
])

function normalizeAllowedExt(input) {
	if (!Array.isArray(input) || input.length === 0) {
		return null
	}

	const extensions = [
		...new Set(
			input
				.filter(item => typeof item === 'string')
				.map(item => item.trim().toLowerCase())
				.filter(Boolean)
		)
	]

	if (extensions.includes('all')) {
		return ['all']
	}

	if (extensions.length === 0) {
		return null
	}

	const hasUnsupported = extensions.some(item => {
		return !SUPPORTED_EXTENSIONS.has(item)
	})

	if (hasUnsupported) {
		return null
	}

	return extensions
}

exports.main = async (event, context) => {
	const {
		subject,
		desc,
		deadline,
		group_id,
		allowed_ext,
		rename_rule,
		need_submit,
		images,
		file_url,
		file_name
	} = event

	if (!subject || !desc || !deadline || !group_id) {
		return {
			code: 400,
			msg: '请填写完整信息'
		}
	}

	const normalizedAllowedExt = normalizeAllowedExt(allowed_ext)

	if (!normalizedAllowedExt) {
		return {
			code: 400,
			msg: '请选择有效的允许提交格式'
		}
	}

	const deadlineValue = Number(deadline)

	if (!Number.isFinite(deadlineValue)) {
		return {
			code: 400,
			msg: '截止时间无效'
		}
	}

	if (deadlineValue <= Date.now()) {
		return {
			code: 400,
			msg: '截止时间必须晚于当前时间'
		}
	}

	try {
		const res = await db.collection('homeworks').add({
			subject,
			title: desc,
			desc,
			allowed_ext: normalizedAllowedExt,
			deadline: deadlineValue,
			group_id,
			rename_rule: rename_rule || 'id_name',
			need_submit: need_submit !== false,
			images: images || [],
			file_url: file_url || '',
			file_name: file_name || '',
			created_at: Date.now()
		})

		let notificationCreated = false

		try {
			await db.collection('notifications').add({
				content: `管理员发布了 ${subject} 的作业，请及时查看！`,
				group_id: group_id,
				homework_id: res.id,
				type: 'homework_add',
				created_at: Date.now()
			})

			notificationCreated = true

			try {
				await trimNotifications(group_id)
			} catch (trimError) {
				console.warn('作业通知已创建，但旧通知清理失败：', trimError)
			}
		} catch (notificationError) {
			console.warn('作业已创建，但通知发送失败：', notificationError)
		}

		return {
			code: 200,
			msg: notificationCreated
				? '作业发布成功！'
				: '作业发布成功，但通知发送失败',
			data: {
				id: res.id,
				notification_created: notificationCreated
			}
		}
	} catch (error) {
		console.error('发布作业失败：', error)
		return {
			code: 500,
			msg: '服务器内部错误',
			error: error.message
		}
	}
}
