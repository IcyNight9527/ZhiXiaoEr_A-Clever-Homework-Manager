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

async function deleteCloudFiles(fileList) {
	const validFiles = [
		...new Set(
			(fileList || []).filter(fileID => {
				return (
					typeof fileID === 'string' &&
					fileID.startsWith('cloud://')
				)
			})
		)
	]

	if (validFiles.length === 0) {
		return true
	}

	let allSucceeded = true

	for (let i = 0; i < validFiles.length; i += 50) {
		const batch = validFiles.slice(i, i + 50)

		try {
			await uniCloud.deleteFile({
				fileList: batch
			})
		} catch (error) {
			allSucceeded = false
			console.warn('清理旧作业文件失败：', error)
		}
	}

	return allSucceeded
}

exports.main = async (event, context) => {
	const {
		homework_id,
		user_id,
		group_id,
		subject,
		desc,
		allowed_ext,
		deadline,
		rename_rule,
		need_submit,
		images,
		file_url,
		file_name
	} = event

	if (!homework_id || !user_id || !group_id) {
		return {
			code: 400,
			msg: '参数不完整'
		}
	}

	try {
		// 1. 校验管理员身份
		const ugRes = await db.collection('user_groups')
			.where({ user_id, group_id })
			.get()

		if (ugRes.data.length === 0 || !ugRes.data[0].is_admin) {
			return {
				code: 403,
				msg: '你没有权限编辑作业'
			}
		}

		// 2. 查询原作业
		const hwRes = await db.collection('homeworks')
			.doc(homework_id)
			.get()

		if (hwRes.data.length === 0) {
			return {
				code: 404,
				msg: '作业不存在'
			}
		}

		const oldHomework = hwRes.data[0]

		if (oldHomework.group_id !== group_id) {
			return {
				code: 403,
				msg: '作业不属于这个群组'
			}
		}

		let deadlineValue

		if (deadline !== undefined) {
			deadlineValue = Number(deadline)

			if (!Number.isFinite(deadlineValue)) {
				return {
					code: 400,
					msg: '截止时间无效'
				}
			}

			const oldDeadline = Number(oldHomework.deadline) || 0

			if (
				deadlineValue !== oldDeadline &&
				deadlineValue <= Date.now()
			) {
				return {
					code: 400,
					msg: '新的截止时间必须晚于当前时间'
				}
			}
		}
		// 3. 组装更新字段
		const updateData = {}

		if (subject !== undefined) {
			updateData.subject = subject
		}

		if (desc !== undefined) {
			updateData.desc = desc
			updateData.title = desc
		}

		if (allowed_ext !== undefined) {
			updateData.allowed_ext = allowed_ext
		}

		if (deadline !== undefined) {
			updateData.deadline = deadlineValue
		}

		if (rename_rule !== undefined) {
			updateData.rename_rule = rename_rule
		}

		if (need_submit !== undefined) {
			updateData.need_submit = need_submit
		}

		if (images !== undefined) {
			updateData.images = images
		}

		if (file_url !== undefined) {
			updateData.file_url = file_url
		}

		if (file_name !== undefined) {
			updateData.file_name = file_name
		}

		// 4. 更新数据库
		await db.collection('homeworks')
			.doc(homework_id)
			.update(updateData)

		// 5. 计算需要清理的旧文件
		const oldImages = Array.isArray(oldHomework.images)
			? oldHomework.images
			: []

		const newImages = Array.isArray(images)
			? images
			: oldImages

		const removedImages = oldImages.filter(oldFileID => {
			return (
				typeof oldFileID === 'string' &&
				oldFileID.startsWith('cloud://') &&
				!newImages.includes(oldFileID)
			)
		})

		const oldFileUrl = oldHomework.file_url || ''
		const newFileUrl = file_url !== undefined
			? file_url
			: oldFileUrl

		const removedFiles = [
			...removedImages,
			oldFileUrl !== newFileUrl ? oldFileUrl : ''
		].filter(Boolean)

		const fileCleanupSuccess = await deleteCloudFiles(removedFiles)

		// 6. 添加更新通知
		const finalSubject = subject || oldHomework.subject

		let notificationCreated = false

		try {
			await db.collection('notifications').add({
				content: `管理员更新了 ${finalSubject} 的作业内容，请及时查看！`,
				group_id: group_id,
				homework_id: homework_id,
				type: 'homework_update',
				created_at: Date.now()
			})

			notificationCreated = true

			try {
				await trimNotifications(group_id)
			} catch (trimError) {
				console.warn('更新通知已创建，但旧通知清理失败：', trimError)
			}
		} catch (notificationError) {
			console.warn('作业已更新，但通知发送失败：', notificationError)
		}

		return {
			code: 200,
			msg: notificationCreated
				? '作业已更新，并已发送通知'
				: '作业已更新，但通知发送失败',
			data: {
				file_cleanup_success: fileCleanupSuccess,
				notification_created: notificationCreated
			}
		}
	} catch (error) {
		console.error('更新作业失败：', error)
		return {
			code: 500,
			msg: '服务器内部错误'
		}
	}
}
