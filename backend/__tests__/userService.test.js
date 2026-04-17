jest.mock('../models/userModel');
jest.mock('bcryptjs', () => ({
	compare: jest.fn(),
	hash: jest.fn(),
}));

const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const userService = require('../services/userService');

describe('userService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('changePassword()', () => {
		test('TC_USER_01 - should_hash_and_save_new_password_when_current_password_is_correct', async () => {
			// Input: id=1, currentPassword="OldPass@1", newPassword="NewPass@1"
			// Expected Output: new password is hashed and saved; updatePassword is called; return update result
			// Mock: user exists, bcrypt.compare=true, bcrypt.hash returns hashed_new_password
			// CheckDB: verify model methods are called with correct parameters
			// Rollback: using Jest mocks only, so no real DB write happens
			userModel.findByIdWithPassword.mockResolvedValue({
				id: 1,
				password: 'hashed_old_password',
			});
			bcrypt.compare.mockResolvedValue(true);
			bcrypt.hash.mockResolvedValue('hashed_new_password');
			const mockUpdateResult = { affectedRows: 1 };
			userModel.updatePassword.mockResolvedValue(mockUpdateResult);

			const result = await userService.changePassword(1, 'OldPass@1', 'NewPass@1');

			expect(userModel.findByIdWithPassword).toHaveBeenCalledWith(1);
			expect(bcrypt.compare).toHaveBeenCalledWith('OldPass@1', 'hashed_old_password');
			expect(bcrypt.hash).toHaveBeenCalledWith('NewPass@1', expect.any(Number));
			// CheckDB
			expect(userModel.updatePassword).toHaveBeenCalledWith(1, 'hashed_new_password');
			expect(result).toEqual(mockUpdateResult);
		});

		test('TC_USER_02 - should_throw_INCORRECT_PASSWORD_when_current_password_is_wrong', async () => {
			// Input: id=1, currentPassword="WrongPass", newPassword="NewPass@1"
			// Expected Output: throw Error with code="INCORRECT_PASSWORD"
			// Mock: bcrypt.compare=false; no DB update
			// CheckDB: updatePassword must not be called
			// Rollback: using Jest mocks only, so no real DB write happens
			userModel.findByIdWithPassword.mockResolvedValue({
				id: 1,
				password: 'hashed_old_password',
			});
			bcrypt.compare.mockResolvedValue(false);

			await expect(userService.changePassword(1, 'WrongPass', 'NewPass@1')).rejects.toMatchObject({
				message: 'Current password is incorrect',
				code: 'INCORRECT_PASSWORD',
			});

			expect(userModel.findByIdWithPassword).toHaveBeenCalledWith(1);
			expect(bcrypt.compare).toHaveBeenCalledWith('WrongPass', 'hashed_old_password');
			expect(bcrypt.hash).not.toHaveBeenCalled();
			expect(userModel.updatePassword).not.toHaveBeenCalled();
		});

		test('TC_USER_03 - should_throw_USER_NOT_FOUND_when_user_does_not_exist', async () => {
			// Input: id=999, currentPassword="any", newPassword="any"
			// Expected Output: throw Error with code="USER_NOT_FOUND"
			// Mock: userModel.findByIdWithPassword returns null
			// CheckDB: bcrypt and updatePassword must not be called
			// Rollback: using Jest mocks only, so no real DB write happens
			userModel.findByIdWithPassword.mockResolvedValue(null);

			await expect(userService.changePassword(999, 'any', 'any')).rejects.toMatchObject({
				message: 'User not found',
				code: 'USER_NOT_FOUND',
			});

			expect(userModel.findByIdWithPassword).toHaveBeenCalledWith(999);
			expect(bcrypt.compare).not.toHaveBeenCalled();
			expect(bcrypt.hash).not.toHaveBeenCalled();
			expect(userModel.updatePassword).not.toHaveBeenCalled();
		});
	});

	describe('updateUser()', () => {
		test('TC_USER_04 - should_return_updated_user_when_id_exists_and_payload_is_valid', async () => {
			// Input: id=3, data={ name: "Van", phone: "0912345678" }
			// Expected Output: return updated user data from model
			// Mock: userModel.updateById resolves updated object
			// CheckDB: updateById must be called with correct id and payload
			// Rollback: using Jest mocks only, so no real DB write happens
			const payload = { name: 'Van', phone: '0912345678' };
			const mockResult = { id: 3, ...payload };

			userModel.updateById.mockResolvedValue(mockResult);

			const result = await userService.updateUser(3, payload);

			expect(userModel.updateById).toHaveBeenCalledTimes(1);
			expect(userModel.updateById).toHaveBeenCalledWith(3, payload);
			expect(result).toEqual(mockResult);
		});

		test('TC_USER_05 - should_return_null_when_user_id_does_not_exist', async () => {
			// Input: id=999, data={ name: "Ghost" }
			// Expected Output: return null (no user updated)
			// Mock: userModel.updateById resolves null
			// CheckDB: updateById must be called with id=999
			// Rollback: using Jest mocks only, so no real DB write happens
			const payload = { name: 'Ghost' };
			userModel.updateById.mockResolvedValue(null);

			const result = await userService.updateUser(999, payload);

			expect(userModel.updateById).toHaveBeenCalledTimes(1);
			expect(userModel.updateById).toHaveBeenCalledWith(999, payload);
			expect(result).toBeNull();
		});

		test('TC_USER_06 - should_throw_error_when_model_updateById_fails', async () => {
			// Input: id=3, data={ name: "Van" }
			// Expected Output: throw DB error from model
			// Mock: userModel.updateById rejects with error
			// CheckDB: updateById must be called before throwing
			// Rollback: using Jest mocks only, so no real DB write happens
			const payload = { name: 'Van' };
			const dbError = new Error('DB update failed');
			userModel.updateById.mockRejectedValue(dbError);

			await expect(userService.updateUser(3, payload)).rejects.toThrow('DB update failed');

			expect(userModel.updateById).toHaveBeenCalledTimes(1);
			expect(userModel.updateById).toHaveBeenCalledWith(3, payload);
		});
	});
});
