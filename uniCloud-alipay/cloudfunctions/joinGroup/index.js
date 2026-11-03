const db = uniCloud.database()

exports.main = async (event, context) => {
	const { group_code, group_password, user_id } = event

	if (!group_code || !group_password || !user_id) {
		return { code: 400, msg: '请填写群组号和密码' }
	}

	try {
		// 1. 根据群组号查群组
		const groupRes = await db.collection('groups').where({ group_code: group_code }).get()
		if (groupRes.data.length === 0) {
			return { code: 404, msg: '群组不存在，请检查群组号' }
		}

		const group = groupRes.data[0]

		// 2. 校验群组密码
		if (group.group_password !== group_password) {
			return { code: 403, msg: '群组密码错误' }
		}

		// 3. 检查是否已经加入过这个群组
		const checkRes = await db.collection('user_groups').where({
			user_id: user_id,
			group_id: group._id
		}).get()

		if (checkRes.data.length > 0) {
			return { code: 409, msg: '你已经加入过这个群组了' }
		}

		// 4. 加入群组
		await db.collection('user_groups').add({
			user_id: user_id,
			group_id: group._id,
			is_admin: false,
			admin_in_group: true,
			joined_at: Date.now()
		})

		return {
			code: 200,
			msg: '加入群组成功！',
			data: {
				group_id: group._id,
				group_name: group.name
			}
		}

	} catch (e) {
		console.error('加入群组失败：', e)
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
