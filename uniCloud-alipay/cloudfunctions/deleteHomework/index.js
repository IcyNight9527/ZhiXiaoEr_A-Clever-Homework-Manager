const db = uniCloud.database()

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
			console.warn('删除作业云文件失败：', error)
		}
	}

	return allSucceeded
}

exports.main = async (event, context) => {
	const { homework_id, user_id, group_id } = event

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
				msg: '你没有权限删除作业'
			}
		}

		// 2. 查询作业本身
		const hwRes = await db.collection('homeworks')
			.doc(homework_id)
			.get()

		if (hwRes.data.length === 0) {
			return {
				code: 404,
				msg: '作业不存在'
			}
		}

		const homework = hwRes.data[0]

		// 防止误删其他群组的作业文件
		if (homework.group_id !== group_id) {
			return {
				code: 403,
				msg: '作业不属于这个群组'
			}
		}

		// 3. 查询该作业的所有学生提交
		const subRes = await db.collection('submissions')
			.where({
				homework_id: homework_id,
				group_id: group_id
			})
			.get()

		const submissionFiles = subRes.data
			.map(item => item.file_url)
			.filter(Boolean)

		const homeworkImages = Array.isArray(homework.images)
			? homework.images
			: []

		const fileList = [
			...homeworkImages,
			homework.file_url,
			...submissionFiles
		].filter(Boolean)

		// 4. 清理作业图片、附件和学生提交文件
		const fileCleanupSuccess = await deleteCloudFiles(fileList)

		// 5. 删除数据库关联记录
		await db.collection('notifications')
			.where({ homework_id })
			.remove()

		await db.collection('submissions')
			.where({ homework_id })
			.remove()

		await db.collection('homeworks')
			.doc(homework_id)
			.remove()

		return {
			code: 200,
			msg: '作业已删除',
			data: {
				file_cleanup_success: fileCleanupSuccess
			}
		}
	} catch (error) {
		console.error('删除作业失败：', error)
		return {
			code: 500,
			msg: '服务器内部错误'
		}
	}
}
