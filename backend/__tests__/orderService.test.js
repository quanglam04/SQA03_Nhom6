jest.mock('../models', () => ({
	cartModel: {
		findById: jest.fn(),
		getCartItemsWithDetails: jest.fn(),
		clearCartItems: jest.fn(),
	},
	orderModel: {
		create: jest.fn(),
		addOrderItem: jest.fn(),
	},
	productModel: {
		updateVariantStock: jest.fn(),
	},
	userModel: {},
}));

jest.mock('../config/mysql', () => ({
	pool: {
		getConnection: jest.fn(),
	},
}));

const { cartModel, orderModel, productModel } = require('../models');
const { pool } = require('../config/mysql');
const OrderService = require('../services/orderService');

const createMockConnection = () => ({
	beginTransaction: jest.fn().mockResolvedValue(),
	commit: jest.fn().mockResolvedValue(),
	rollback: jest.fn().mockResolvedValue(),
	release: jest.fn(),
});

describe('OrderService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('createOrder()', () => {
		test('TC_ORD_01 - should_create_order_successfully_from_valid_cart', async () => {
			// Input: userId=1, cartId=1, shippingAddress="123 Hà Nội", paymentMethod="COD", note=""
			// Expected Output: return { order_id, total_price }; create/addItem/updateStock/clearCart are called
			// CheckDB: verify createOrder + addOrderItem + updateVariantStock + clearCartItems calls
			// Rollback: using mocked transaction only, no real DB write
			const connection = createMockConnection();
			pool.getConnection.mockResolvedValue(connection);

			const cartItems = [
				{
					variant_id: 7,
					variant_name: 'Size M',
					quantity: 2,
					stock: 10,
					price_sale: '50000',
				},
				{
					variant_id: 8,
					variant_name: 'Size L',
					quantity: 1,
					stock: 7,
					price_sale: '100000',
				},
			];

			cartModel.getCartItemsWithDetails.mockResolvedValue(cartItems);
			orderModel.create.mockResolvedValue({ id: 88 });
			orderModel.addOrderItem.mockResolvedValue(true);
			productModel.updateVariantStock.mockResolvedValue(true);
			cartModel.clearCartItems.mockResolvedValue(true);

			const result = await OrderService.createOrder({
				userId: 1,
				cartId: 1,
				shippingAddress: '123 Hà Nội',
				paymentMethod: 'COD',
				note: '',
			});

			expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
			expect(cartModel.getCartItemsWithDetails).toHaveBeenCalledWith(1);
			expect(orderModel.create).toHaveBeenCalledWith({
				user_id: 1,
				total_price: 250000,
				status: 'pending',
				payment_status: 'unpaid',
				shipping_address: '123 Hà Nội',
				payment_method: 'COD',
				note: '',
			});
			expect(orderModel.addOrderItem).toHaveBeenCalledWith({
				order_id: 88,
				product_variant_id: 7,
				quantity: 2,
				price: '50000',
			});
			expect(orderModel.addOrderItem).toHaveBeenCalledWith({
				order_id: 88,
				product_variant_id: 8,
				quantity: 1,
				price: '100000',
			});
			expect(productModel.updateVariantStock).toHaveBeenCalledWith(7, 2, 'decrement');
			expect(productModel.updateVariantStock).toHaveBeenCalledWith(8, 1, 'decrement');
			expect(cartModel.clearCartItems).toHaveBeenCalledWith(1);
			expect(connection.commit).toHaveBeenCalledTimes(1);
			expect(connection.rollback).not.toHaveBeenCalled();
			expect(connection.release).toHaveBeenCalledTimes(1);
			expect(result).toEqual({ order_id: 88, total_price: 250000 });
		});

		test('TC_ORD_02 - should_throw_error_when_cart_has_no_items', async () => {
			// Input: userId=1, cartId=1
			// Expected Output: throw Error("Cart is empty")
			// CheckDB: getCartItemsWithDetails called, order creation not called
			// Rollback: transaction is rolled back via mocked connection
			const connection = createMockConnection();
			pool.getConnection.mockResolvedValue(connection);
			cartModel.getCartItemsWithDetails.mockResolvedValue([]);

			await expect(
				OrderService.createOrder({
					userId: 1,
					cartId: 1,
					shippingAddress: '123 Test Street',
					paymentMethod: 'cod',
					note: '',
				})
			).rejects.toThrow('Cart is empty');

			expect(connection.rollback).toHaveBeenCalledTimes(1);
			expect(connection.commit).not.toHaveBeenCalled();
			expect(cartModel.getCartItemsWithDetails).toHaveBeenCalledWith(1);
			expect(orderModel.create).not.toHaveBeenCalled();
			expect(connection.release).toHaveBeenCalledTimes(1);
		});

		test('TC_ORD_03 - should_throw_error_when_stock_is_insufficient_for_item', async () => {
			// Input: userId=1, cartId=1, cart has item quantity=5 but stock=2
			// Expected Output: throw Error containing "Insufficient stock for"
			// CheckDB: order creation and stock updates must not happen
			// Rollback: transaction is rolled back via mocked connection
			const connection = createMockConnection();
			pool.getConnection.mockResolvedValue(connection);

			cartModel.getCartItemsWithDetails.mockResolvedValue([
				{
					variant_id: 7,
					variant_name: 'Size M',
					quantity: 5,
					stock: 2,
					price_sale: '100000',
				},
			]);

			await expect(
				OrderService.createOrder({
					userId: 1,
					cartId: 1,
					shippingAddress: '123 Test Street',
					paymentMethod: 'cod',
					note: '',
				})
			).rejects.toThrow('Insufficient stock for product variant Size M');

			expect(connection.rollback).toHaveBeenCalledTimes(1);
			expect(orderModel.create).not.toHaveBeenCalled();
			expect(productModel.updateVariantStock).not.toHaveBeenCalled();
			expect(cartModel.clearCartItems).not.toHaveBeenCalled();
			expect(connection.commit).not.toHaveBeenCalled();
			expect(connection.release).toHaveBeenCalledTimes(1);
		});

		test('TC_ORD_04 - should_calculate_total_price_with_subtotal_shipping_and_tax', async () => {
			// Input: userId=1, cartId=1, paymentMethod="COD", item quantity=2, price_sale=100000
			// Expected Output: total_price = 200000 + 30000 + 20000 = 250000
			// CheckDB: verify total_price passed to orderModel.create is correct
			// Rollback: using mocked transaction only, no real DB write
			const connection = createMockConnection();
			pool.getConnection.mockResolvedValue(connection);

			cartModel.getCartItemsWithDetails.mockResolvedValue([
				{
					variant_id: 7,
					variant_name: 'Size M',
					quantity: 2,
					stock: 10,
					price_sale: '100000',
				},
			]);
			orderModel.create.mockResolvedValue({ id: 88 });
			orderModel.addOrderItem.mockResolvedValue(true);
			productModel.updateVariantStock.mockResolvedValue(true);
			cartModel.clearCartItems.mockResolvedValue(true);

			const result = await OrderService.createOrder({
				userId: 1,
				cartId: 1,
				shippingAddress: '123 Test Street',
				paymentMethod: 'COD',
				note: '',
			});

			expect(orderModel.create).toHaveBeenCalledWith({
				user_id: 1,
				total_price: 250000,
				status: 'pending',
				payment_status: 'unpaid',
				shipping_address: '123 Test Street',
				payment_method: 'COD',
				note: '',
			});
			expect(result.total_price).toBe(250000);
			expect(connection.commit).toHaveBeenCalledTimes(1);
			expect(connection.rollback).not.toHaveBeenCalled();
		});
	});

	describe('getCheckoutInfo()', () => {
		test('TC_ORD_05 - should_return_checkout_info_when_cart_is_valid', async () => {
			// Input: cartId=1
			// Expected Output: return object { items[], subtotal, shipping_fee=30000, tax=subtotal*0.1, total_price }
			// CheckDB: findById and getCartItemsWithDetails are called with cartId
			// Rollback: read-only flow with mocks, no DB mutation
			cartModel.findById.mockResolvedValue({ id: 1, user_id: 1 });
			cartModel.getCartItemsWithDetails.mockResolvedValue([
				{ cart_item_id: 1, product_name: 'A', product_avatar: 'a.jpg', variant_name: 'v1', unit: 'pcs', price_sale: '10000', stock: 10, quantity: 1 },
				{ cart_item_id: 2, product_name: 'B', product_avatar: 'b.jpg', variant_name: 'v2', unit: 'pcs', price_sale: '20000', stock: 10, quantity: 1 },
				{ cart_item_id: 3, product_name: 'C', product_avatar: 'c.jpg', variant_name: 'v3', unit: 'pcs', price_sale: '30000', stock: 10, quantity: 1 },
				{ cart_item_id: 4, product_name: 'D', product_avatar: 'd.jpg', variant_name: 'v4', unit: 'pcs', price_sale: '40000', stock: 10, quantity: 1 },
				{ cart_item_id: 5, product_name: 'E', product_avatar: 'e.jpg', variant_name: 'v5', unit: 'pcs', price_sale: '50000', stock: 10, quantity: 1 },
				{ cart_item_id: 6, product_name: 'F', product_avatar: 'f.jpg', variant_name: 'v6', unit: 'pcs', price_sale: '60000', stock: 10, quantity: 1 },
			]);

			const result = await OrderService.getCheckoutInfo(1);

			expect(cartModel.findById).toHaveBeenCalledWith(1);
			expect(cartModel.getCartItemsWithDetails).toHaveBeenCalledWith(1);
			expect(result.items).toHaveLength(6);
			expect(result.subtotal).toBe(210000);
			expect(result.shipping_fee).toBe(30000);
			expect(result.tax).toBe(21000);
			expect(result.total_price).toBe(261000);
			expect(result.items[0]).toEqual(
				expect.objectContaining({
					product_name: 'A',
					price_sale: 10000,
					quantity: 1,
					subtotal: 10000,
				})
			);
		});

		test('TC_ORD_06 - should_throw_error_when_cart_id_does_not_exist', async () => {
			// Input: cartId=9999
			// Expected Output: throw Error("Cart not found")
			// CheckDB: findById called; getCartItemsWithDetails not called
			// Rollback: read-only flow with mocks, no DB mutation
			cartModel.findById.mockResolvedValue(null);

			await expect(OrderService.getCheckoutInfo(9999)).rejects.toThrow('Cart not found');
			expect(cartModel.findById).toHaveBeenCalledWith(9999);
			expect(cartModel.getCartItemsWithDetails).not.toHaveBeenCalled();
		});

		test('TC_ORD_07 - should_throw_error_when_cart_exists_but_has_no_items', async () => {
			// Input: cartId=1
			// Expected Output: throw Error("Cart is empty")
			// CheckDB: findById and getCartItemsWithDetails are called
			// Rollback: read-only flow with mocks, no DB mutation
			cartModel.findById.mockResolvedValue({ id: 1, user_id: 1 });
			cartModel.getCartItemsWithDetails.mockResolvedValue([]);

			await expect(OrderService.getCheckoutInfo(1)).rejects.toThrow('Cart is empty');
			expect(cartModel.findById).toHaveBeenCalledWith(1);
			expect(cartModel.getCartItemsWithDetails).toHaveBeenCalledWith(1);
		});
	});
});
