const db = uniCloud.database()

exports.main = async (event, context) => {
	const { group_id, creator_id, target_user_id } = event

	if (!group_id || !creator_id || !target_user_id) {
		return { code: 400, msg: '参数不完整' }
	}

	try {
		// 1. 校验操作者是创建者
		const gRes = await db.collection('groups').doc(group_id).get()
		if (gRes.data.length === 0) return { code: 404, msg: '群组不存在' }
		if (gRes.data[0].admin_id !== creator_id) {
			return { code: 403, msg: '只有创建者才能移出成员' }
		}

		// 2. 不能移出自己
		if (target_user_id === creator_id) {
			return { code: 400, msg: '不能移出自己' }
		}

		// 3. 查成员是否在群里
		const ugRes = await db.collection('user_groups').where({
			group_id, user_id: target_user_id
		}).get()
		if (ugRes.data.length === 0) {
			return { code: 404, msg: '该成员不在群组中' }
		}

		// 4. 删除该成员的提交记录 + 云存储文件
		const subRes = await db.collection('submissions').where({
			group_id, student_id: target_user_id
		}).get()
		const fileList = subRes.data.map(s => s.file_url).filter(url => url)
		if (fileList.length > 0) {
			try {
				await uniCloud.deleteFile({ fileList })
			} catch (err) {
				console.warn('删除云存储文件失败：', err)
			}
		}
		await db.collection('submissions').where({
			group_id, student_id: target_user_id
		}).remove()

		// 5. 删除 user_groups 记录
		await db.collection('user_groups').doc(ugRes.data[0]._id).remove()

		return { code: 200, msg: '已移出群组' }

	} catch (e) {
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
