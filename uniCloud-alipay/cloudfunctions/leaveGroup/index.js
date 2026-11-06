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
			console.warn('删除群组云文件失败：', error)
		}
	}

	return allSucceeded
}

exports.main = async (event, context) => {
	const { user_id, group_id } = event

	if (!user_id || !group_id) {
		return {
			code: 400,
			msg: '参数不完整'
		}
	}

	try {
		// 1. 查询群组
		const groupRes = await db.collection('groups')
			.doc(group_id)
			.get()

		if (groupRes.data.length === 0) {
			return {
				code: 404,
				msg: '群组不存在'
			}
		}

		const group = groupRes.data[0]

		// ==========================================
		// 创建者：解散群组
		// ==========================================
		if (group.admin_id === user_id) {
			// 查询所有学生提交
			const submissionRes = await db.collection('submissions')
				.where({ group_id })
				.get()

			const submissionFiles = submissionRes.data
				.map(item => item.file_url)
				.filter(Boolean)

			// 查询所有作业
			const homeworkRes = await db.collection('homeworks')
				.where({ group_id })
				.get()

			const homeworkFiles = []

			for (const homework of homeworkRes.data) {
				if (Array.isArray(homework.images)) {
					homeworkFiles.push(...homework.images)
				}

				if (homework.file_url) {
					homeworkFiles.push(homework.file_url)
				}
			}

			// 清理学生提交、作业图片和作业附件
			const fileCleanupSuccess = await deleteCloudFiles([
				...submissionFiles,
				...homeworkFiles
			])

			// 删除数据库中的所有关联数据
			await db.collection('notifications')
				.where({ group_id })
				.remove()

			await db.collection('submissions')
				.where({ group_id })
				.remove()

			await db.collection('homeworks')
				.where({ group_id })
				.remove()

			await db.collection('user_groups')
				.where({ group_id })
				.remove()

			await db.collection('groups')
				.doc(group_id)
				.remove()

			return {
				code: 200,
				msg: '群组已解散',
				action: 'dismiss',
				data: {
					file_cleanup_success: fileCleanupSuccess
				}
			}
		}

		// ==========================================
		// 普通成员：退出群组
		// ==========================================
		const memberRes = await db.collection('user_groups')
			.where({
				user_id,
				group_id
			})
			.get()

		if (memberRes.data.length === 0) {
			return {
				code: 404,
				msg: '你不在这个群组里'
			}
		}

		// 只查询这个人自己的提交
		const mySubmissionRes = await db.collection('submissions')
			.where({
				group_id,
				student_id: user_id
			})
			.get()

		const mySubmissionFiles = mySubmissionRes.data
			.map(item => item.file_url)
			.filter(Boolean)

		const fileCleanupSuccess = await deleteCloudFiles(
			mySubmissionFiles
		)

		// 只删除自己的提交记录
		await db.collection('submissions')
			.where({
				group_id,
				student_id: user_id
			})
			.remove()

		// 删除自己的群组成员记录
		await db.collection('user_groups')
			.doc(memberRes.data[0]._id)
			.remove()

		return {
			code: 200,
			msg: '已退出群组',
			action: 'leave',
			data: {
				file_cleanup_success: fileCleanupSuccess
			}
		}
	} catch (error) {
		console.error('退出或解散群组失败：', error)

		return {
			code: 500,
			msg: '服务器内部错误'
		}
	}
}
