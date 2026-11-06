const db = uniCloud.database()

async function cleanupCloudFile(fileID) {
	if (
		typeof fileID !== 'string' ||
		!fileID.startsWith('cloud://')
	) {
		return true
	}

	try {
		await uniCloud.deleteFile({
			fileList: [fileID]
		})
		return true
	} catch (error) {
		console.warn('删除提交文件失败：', error)
		return false
	}
}

exports.main = async (event, context) => {
	const { submission_id, user_id } = event

	if (!submission_id || !user_id) {
		return {
			code: 400,
			msg: '参数不完整'
		}
	}

	try {
		const res = await db.collection('submissions')
			.doc(submission_id)
			.get()

		if (res.data.length === 0) {
			return {
				code: 404,
				msg: '提交记录不存在'
			}
		}

		const submission = res.data[0]

		if (submission.student_id !== user_id) {
			return {
				code: 403,
				msg: '只能删除自己的提交'
			}
		}

		// 先删除数据库记录，确保用户能够正常完成删除操作
		await db.collection('submissions')
			.doc(submission_id)
			.remove()

		// 再进行云文件清理
		const fileCleanupSuccess = await cleanupCloudFile(
			submission.file_url
		)

		return {
			code: 200,
			msg: '已删除提交',
			data: {
				file_cleanup_success: fileCleanupSuccess
			}
		}
	} catch (error) {
		console.error('删除提交失败：', error)
		return {
			code: 500,
			msg: '服务器内部错误'
		}
	}
}
