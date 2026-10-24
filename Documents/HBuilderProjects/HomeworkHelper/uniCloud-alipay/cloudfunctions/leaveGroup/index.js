const db = uniCloud.database()

exports.main = async (event, context) => {
	const { user_id, group_id } = event
	if (!user_id || !group_id) return { code: 400, msg: '参数不完整' }

	try {
		// 1. 查群组信息
		const gRes = await db.collection('groups').doc(group_id).get()
		if (gRes.data.length === 0) return { code: 404, msg: '群组不存在' }
		const group = gRes.data[0]

		// 2. 判断是不是创建者
		if (group.admin_id === user_id) {
			// === 解散群组 ===
			// 2a. 查出该群组所有提交记录，拿到云存储文件路径
			const subRes = await db.collection('submissions').where({ group_id }).get()
			const fileList = subRes.data.map(s => s.file_url).filter(url => url)

			// 2b. 删除云存储文件（如果有一批，最多支持 50 个/次）
			if (fileList.length > 0) {
				// 分批删除，每批最多 50 个
				for (let i = 0; i < fileList.length; i += 50) {
					const batch = fileList.slice(i, i + 50)
					try {
						await uniCloud.deleteFile({ fileList: batch })
					} catch (err) {
						console.warn('删除云存储文件失败（部分）：', err)
					}
				}
			}

			// 2c. 删除所有关联数据
			await db.collection('user_groups').where({ group_id }).remove()
			await db.collection('homeworks').where({ group_id }).remove()
			await db.collection('notifications').where({ group_id }).remove()
			await db.collection('submissions').where({ group_id }).remove()

			// 2d. 删除群组本身
			await db.collection('groups').doc(group_id).remove()

			return { code: 200, msg: '群组已解散', action: 'dismiss' }
		} else {
			// === 退出群组 ===
			const ugRes = await db.collection('user_groups').where({ user_id, group_id }).get()
			if (ugRes.data.length === 0) return { code: 404, msg: '你不在这个群组里' }

			// 2a. 查出这个人在这个群组的所有提交记录
			const subRes = await db.collection('submissions').where({ group_id, student_id: user_id }).get()
			const fileList = subRes.data.map(s => s.file_url).filter(url => url)

			// 2b. 删除云存储文件
			if (fileList.length > 0) {
				try {
					await uniCloud.deleteFile({ fileList })
				} catch (err) {
					console.warn('删除云存储文件失败：', err)
				}
			}

			// 2c. 删除该用户在这个群组的提交记录
			await db.collection('submissions').where({ group_id, student_id: user_id }).remove()

			// 2d. 删除 user_groups 记录
			await db.collection('user_groups').doc(ugRes.data[0]._id).remove()

			return { code: 200, msg: '已退出群组', action: 'leave' }
		}

	} catch (e) {
		console.error('操作失败：', e)
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
