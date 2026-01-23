import React, { useState, useEffect, useRef } from "react";
import Layout from "./../components/layout/Layout";
import { useCart } from "../context/cart";
import { useAuth } from "../context/auth";
import { useNavigate } from "react-router-dom";
import dropin from "braintree-web-drop-in";
import axios from "axios";
import toast from "react-hot-toast";
import "../styles/CartStyles.css";

const CartPage = () => {
  const [auth, setAuth] = useAuth();
  const [cart, setCart] = useCart();
  const [clientToken, setClientToken] = useState("");
  const [instance, setInstance] = useState(null);
  const [loading, setLoading] = useState(false);
  const dropinContainer = useRef(null);
  const navigate = useNavigate();

  //total price
  const totalPrice = () => {
    try {
      let total = 0;
      cart?.map((item) => {
        total = total + item.price;
      });
      return total.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      });
    } catch (error) {
      console.log(error);
    }
  };
  //detele item
  const removeCartItem = (pid) => {
    try {
      let myCart = [...cart];
      let index = myCart.findIndex((item) => item._id === pid);
      myCart.splice(index, 1);
      setCart(myCart);
      localStorage.setItem("cart", JSON.stringify(myCart));
    } catch (error) {
      console.log(error);
    }
  };

  //get payment gateway token
  const getToken = async () => {
    try {
      const { data } = await axios.get("/api/product/braintree/token");
      setClientToken(data?.clientToken);
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    if (auth?.token) getToken();
  }, [auth?.token]);

  useEffect(() => {
    if (!clientToken || !dropinContainer.current) return;

    let dropinInstance;

    dropin.create(
      {
        authorization: clientToken,
        container: dropinContainer.current,
        paypal:{flow:"vault"},
      },
      (err, instance) => {
        if (err) {
          console.error("Braintree Drop-In error:", err);
          return;
        }
        dropinInstance = instance;
        setInstance(instance);

      }
    );

    return () => {
      if (dropinInstance) dropinInstance.teardown(); 
    };
  }, [clientToken]);

  //handle payment 
   const handlePayment = async () => {
    try {
      setLoading(true);
      const { nonce } = await instance.requestPaymentMethod();
      const { data } = await axios.post("/api/product/braintree/payment", {
        nonce,
        cart,
      });
      setLoading(false);
      localStorage.removeItem("cart");
      setCart([]);
      navigate("/dashboard/user/orders");
      toast.success("Payment Completed Successfully ");
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };
  return (
    <Layout>
       <div className="cart-page container">
        <div className="row mb-3">
          <div className="col-md-12">
            <h1 className="text-center">
              Hello {auth?.token && auth?.user?.name}
            </h1>
            <h4 className="text-center">
              {cart.length
                ? `You have ${cart.length} items in your cart`
                : "Your Cart Is Empty"}
            </h4>
          </div>
        </div>

        <div className="row">
          {/* Cart Items */}
          <div className="col-md-7">
            {cart.map((p) => (
              <div
                key={p._id}
                className="row card p-3 mb-3 flex-row align-items-center"
              >
                <div className="col-md-4 d-flex justify-content-center">
                  <img
                    src={`/api/product/product-photo/${p._id}`}
                    alt={p.name}
                    width="120"
                    height="120"
                  />
                </div>
                <div className="col-md-8">
                  <p>{p.name}</p>
                  <p>{p.description.substring(0, 40)}...</p>
                  <p className="fw-bold text-success">
                    Price : ${p.price}
                  </p>
                  <button
                    className="btn btn-danger"
                    onClick={() => removeCartItem(p._id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="col-md-5 cart-summary text-center">
            <h2>Cart Summary</h2>
            <p>Total | Checkout | Payment</p>
            <hr />
            <h4>Total : {totalPrice()}</h4>

            {auth?.user?.address ? (
              <>
                <h4>Delivery Address</h4>
                <h5>{auth.user.address}</h5>
                <button
                  className="btn btn-outline-warning mt-2"
                  onClick={() => navigate("/dashboard/user/profile")}
                >
                  Update Address
                </button>
              </>
            ) : (
              <button
                className="btn btn-outline-warning mt-2"
                onClick={() =>
                  navigate(auth?.token ? "/dashboard/user/profile" : "/login", {
                    state: "/cart",
                  })
                }
              >
                Login to Checkout
              </button>
            )}

            {cart.length > 0 && (
              <div className="mt-3" ref={dropinContainer}></div>
            )}

            <button
              className="btn btn-primary mt-3"
              onClick={handlePayment}
              disabled={loading || !instance || !auth?.user?.address}
            >
              {loading ? "Processing..." : "Make Payment"}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CartPage;
