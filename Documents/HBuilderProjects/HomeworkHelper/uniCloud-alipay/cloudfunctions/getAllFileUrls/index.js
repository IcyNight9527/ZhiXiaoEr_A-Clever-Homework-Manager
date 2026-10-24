const db = uniCloud.database()

exports.main = async (event, context) => {
	const { homework_id, group_id } = event

	if (!homework_id || !group_id) {
		return { code: 400, msg: '参数不完整' }
	}

	try {
		// 1. 查这份作业的所有提交记录
		const subRes = await db.collection('submissions').where({
			homework_id: homework_id,
			group_id: group_id
		}).get()

		if (subRes.data.length === 0) {
			return { code: 200, msg: '暂无提交', data: [] }
		}

		// 2. 收集文件路径
		const fileList = subRes.data.map(s => ({
			fileID: s.file_url,
			renamed_file: s.renamed_file || s.original_name || 'unknown'
		})).filter(f => f.fileID)

		// 3. 用 getTempFileURL 换取临时下载链接
		const tempRes = await uniCloud.getTempFileURL({
			fileList: fileList.map(f => f.fileID)
		})

		// 4. 组装结果
		const result = fileList.map((f, i) => ({
			name: f.renamed_file,
			url: tempRes.fileList[i] ? tempRes.fileList[i].tempFileURL : ''
		})).filter(f => f.url)

		return { code: 200, msg: '获取成功', data: result }

	} catch (e) {
		console.error('获取文件失败：', e)
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
