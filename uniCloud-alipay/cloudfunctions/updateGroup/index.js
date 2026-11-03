const db = uniCloud.database()

exports.main = async (event, context) => {
	const { group_id, user_id, new_name } = event

	if (!group_id || !user_id || !new_name) {
		return { code: 400, msg: '参数不完整' }
	}
	if (new_name.trim().length === 0) {
		return { code: 400, msg: '群组名不能为空' }
	}

	try {
		// 1. 校验操作者是创建者
		const gRes = await db.collection('groups').doc(group_id).get()
		if (gRes.data.length === 0) return { code: 404, msg: '群组不存在' }
		if (gRes.data[0].admin_id !== user_id) {
			return { code: 403, msg: '只有创建者才能修改群组名' }
		}

		// 2. 更新群组名
		await db.collection('groups').doc(group_id).update({
			name: new_name.trim()
		})

		return { code: 200, msg: '群组名已修改' }

	} catch (e) {
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
