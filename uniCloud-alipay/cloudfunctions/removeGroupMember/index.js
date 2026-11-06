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
			console.warn('删除成员提交文件失败：', error)
		}
	}

	return allSucceeded
}

exports.main = async (event, context) => {
	const {
		group_id,
		creator_id,
		target_user_id
	} = event

	if (!group_id || !creator_id || !target_user_id) {
		return {
			code: 400,
			msg: '参数不完整'
		}
	}

	try {
		// 1. 校验群组和创建者身份
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

		if (group.admin_id !== creator_id) {
			return {
				code: 403,
				msg: '只有创建者才能移出成员'
			}
		}

		// 2. 不能移出自己
		if (target_user_id === creator_id) {
			return {
				code: 400,
				msg: '不能移出自己'
			}
		}

		// 3. 查询目标成员关系
		const memberRes = await db.collection('user_groups')
			.where({
				group_id,
				user_id: target_user_id
			})
			.get()

		if (memberRes.data.length === 0) {
			return {
				code: 404,
				msg: '该成员不在群组中'
			}
		}

		// 4. 查询该成员在本群组的全部提交
		const submissionRes = await db.collection('submissions')
			.where({
				group_id,
				student_id: target_user_id
			})
			.get()

		const submissionFiles = submissionRes.data
			.map(item => item.file_url)
			.filter(Boolean)

		// 5. 删除提交记录
		await db.collection('submissions')
			.where({
				group_id,
				student_id: target_user_id
			})
			.remove()

		// 6. 删除成员关系
		await db.collection('user_groups')
			.doc(memberRes.data[0]._id)
			.remove()

		// 7. 分批清理该成员的云文件
		const fileCleanupSuccess = await deleteCloudFiles(
			submissionFiles
		)

		return {
			code: 200,
			msg: '已移出群组',
			data: {
				deleted_file_count: submissionFiles.length,
				file_cleanup_success: fileCleanupSuccess
			}
		}
	} catch (error) {
		console.error('移出群组成员失败：', error)

		return {
			code: 500,
			msg: '服务器内部错误'
		}
	}
}
