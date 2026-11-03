const db = uniCloud.database()

exports.main = async (event, context) => {
	const { homework_id, user_id, group_id } = event

	if (!homework_id || !user_id || !group_id) {
		return { code: 400, msg: '参数不完整' }
	}

	try {
		// 1. 校验权限
		const ugRes = await db.collection('user_groups').where({ user_id, group_id }).get()
		if (ugRes.data.length === 0 || !ugRes.data[0].is_admin) {
			return { code: 403, msg: '你没有权限删除作业' }
		}

		// 2. 查出这份作业的所有提交记录，拿到云存储文件路径
		const subRes = await db.collection('submissions').where({ homework_id }).get()
		const fileList = subRes.data.map(s => s.file_url).filter(url => url)

		// 3. 删除云存储文件
		if (fileList.length > 0) {
			for (let i = 0; i < fileList.length; i += 50) {
				const batch = fileList.slice(i, i + 50)
				try {
					await uniCloud.deleteFile({ fileList: batch })
				} catch (err) {
					console.warn('删除云存储文件失败（部分）：', err)
				}
			}
		}

		// 4. 删除作业
		await db.collection('homeworks').doc(homework_id).remove()

		// 5. 删除提交记录
		await db.collection('submissions').where({ homework_id }).remove()

		// 6. 删除关联通知
		await db.collection('notifications').where({ homework_id }).remove()

		return { code: 200, msg: '作业已删除' }

	} catch (e) {
		console.error('删除作业失败：', e)
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
