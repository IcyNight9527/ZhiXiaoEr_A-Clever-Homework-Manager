const db = uniCloud.database()

exports.main = async (event, context) => {
	const { file_url, original_name, homework_id, student_id, group_id } = event

	if (!file_url || !homework_id || !student_id || !group_id) {
		return { code: 400, msg: '提交信息不完整' }
	}

	try {
		// 1. 查作业信息
		const hwRes = await db.collection('homeworks').doc(homework_id).get()
		if (hwRes.data.length === 0) {
			return { code: 404, msg: '作业不存在' }
		}
		const homework = hwRes.data[0]
		const allowedExt = homework.allowed_ext || []

		if (homework.need_submit === false) {
		    return { code: 403, msg: '该作业无需提交' }
		}
		// 2. 截止时间校验
		if (Date.now() > homework.deadline) {
			return { code: 403, msg: '已过截止时间，无法提交' }
		}

		// 3. 格式校验
		const ext = original_name.split('.').pop().toLowerCase()
		const isAll = allowedExt.includes('all')
		if (!isAll && !allowedExt.includes(ext)) {
			return { code: 415, msg: `格式错误！只允许 ${allowedExt.join('、')} 格式` }
		}

		console.log('提交参数：', { file_url, original_name, homework_id, student_id, group_id })
		console.log('作业信息：', homework)

		// 4. 自动查姓名
		const userRes = await db.collection('users').where({ userId: student_id }).get()
		if (userRes.data.length === 0) {
			return { code: 404, msg: '用户不存在' }
		}
		const studentName = userRes.data[0].name

		// 5. 根据作业的重命名规则，决定文件怎么命名
		const renameRule = homework.rename_rule || 'id_name'
		let renamedFile = original_name
		if (renameRule === 'id_name') {
			renamedFile = `${student_id}${studentName}.${ext}`
		} else if (renameRule === 'name_id') {
			renamedFile = `${studentName}${student_id}.${ext}`
		}
		// renameRule === 'keep' 时，保持原始文件名

		// 6. 查是否已交过
		const checkRes = await db.collection('submissions')
			.where({ homework_id, student_id }).get()

		let result
		if (checkRes.data.length > 0) {
			// 更新（覆盖旧版本）
			const oldId = checkRes.data[0]._id
			await db.collection('submissions').doc(oldId).update({
				file_url,
				original_name,
				renamed_file: renamedFile,
				group_id,
				submit_time: Date.now(),
				status: 'success'
			})
			return {
				code: 200,
				msg: '作业已重新提交成功！',
				data: { id: oldId, renamed_file: renamedFile }
			}
		} else {
			// 新增
			result = await db.collection('submissions').add({
				homework_id,
				student_id,
				file_url,
				original_name,
				renamed_file: renamedFile,
				group_id,
				submit_time: Date.now(),
				status: 'success'
			})
			return {
				code: 200,
				msg: '作业提交成功！',
				data: { id: result.id, renamed_file: renamedFile }
			}
		}

	} catch (e) {
		console.error('提交作业失败：', e)
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
