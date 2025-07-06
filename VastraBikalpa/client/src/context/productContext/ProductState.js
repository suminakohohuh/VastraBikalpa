import React, { useState, useEffect } from "react";
import ProductContext from "./ProductContext";
import axios from "axios";
import { API_BASE_URL } from "../../redux/config";
import { useNavigate } from "react-router-dom";
const { generateEsewaSignature } = require("./esewasignature");

const ProductState = (props) => {
  const [orderData, setOrderData] = useState(
    JSON.parse(localStorage.getItem("cartData")) || []
  );
  const [summaryData, setSummaryData] = useState([]);
  const [userAddress, setUserAddress] = useState({});
  const [render, setRender] = useState(false);
  const [checkoutPop, setCheckoutPop] = useState([]);
  const navigate = useNavigate();

  const [alluserAddress, setAllUserAddress] = useState([]);
  const [userOrderData, setUserOrderData] = useState([]);

  const combineObjects = (arr) => {
    const combined = {};
    arr.forEach((obj) => {
      const key = obj.productId + obj.userId + obj.pColor;
      if (combined[key]) {
        combined[key].quantity += obj.quantity;
      } else {
        combined[key] = { ...obj };
      }
    });
    return Object.values(combined);
  };

  useEffect(() => {
    localStorage.setItem("cartData", JSON.stringify(orderData));
  }, [orderData]);

  const handleSetOrderData = (data) => {
    const combinedData = combineObjects(data);
    setOrderData(combinedData);
  };

  const fetchOrderAddresses = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/order/orderaddress`,
        {
          headers: {
            "auth-token": `${JSON.parse(localStorage.getItem("token"))}`,
          },
        }
      );
      setAllUserAddress(response.data);
    } catch (error) {
      console.log(error);
    }
  };
  const fetchOrderData = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/order/product/orders/eachuser`,
        {
          headers: {
            "auth-token": `${JSON.parse(localStorage.getItem("token"))}`,
          },
        }
      );
      setUserOrderData(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const postOrderAddresses = async (data) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/order/orderaddress`,
        data,
        {
          headers: {
            "auth-token": JSON.parse(localStorage.getItem("token")),
          },
        }
      );
      return response.data;
    } catch (error) {
      console.log(error);
    }
  };
  const postOrderData = async (data) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/order/product/order`,
        data,
        {
          headers: {
            "auth-token": JSON.parse(localStorage.getItem("token")),
          },
        }
      );
      return response.data;
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchOrderAddresses();
    fetchOrderData();
  }, [render]);
  const [finalPostData, setFinalPostData] = useState({});
  const [isOrderNow, setIsOrderNow] = useState(false);
  const [orderNowData, setOrderNowData] = useState([]);

  // ======================== for update payment ================
  const updateOrderBilling = async (pid, totalAmount, scd, { signal } = {}) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/order/order/payment-success/${pid}/${totalAmount}/${scd}`,
        {},
        {
          headers: {
            "auth-token": JSON.parse(localStorage.getItem("token")),
          },
          signal, // Pass the AbortSignal
        }
      );
      return response.data;
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error("Payment error:", error);
        throw error;
      }
    }
  };

  // ======================== for delete order ================
  const deleteOrder = async (orderId) => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/order/product/order/each/${orderId}`,
        {
          headers: {
            "auth-token": JSON.parse(localStorage.getItem("token")),
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error deleting order:", error);
      throw error; // Re-throw the error to handle it outside of this function if needed
    }
  };

  // ======================== for esewa ======================

  // Updated PaymentPost function for v2
  function PaymentPostV2(path, params) {
    var form = document.createElement("form");
    form.setAttribute("method", "POST");
    form.setAttribute("action", path);

    for (var key in params) {
      var hiddenField = document.createElement("input");
      hiddenField.setAttribute("type", "hidden");
      hiddenField.setAttribute("name", key);
      hiddenField.setAttribute("value", params[key]);
      form.appendChild(hiddenField);
    }

    document.body.appendChild(form);
    form.submit();
  }

  // Updated environment variables structure
  // NEXT_PUBLIC_URL="http://localhost:3000"
  // ESEWA_SECRET_KEY="8gBm/:&EnhH.1/q"
  // ESEWA_MERCHANT_ID="EPAYTEST"
  // ESEWA_BASE_URL_V2="https://rc-epay.esewa.com.np/api/epay/main/v2/form"

  const finalOrderDeliver = async (data, instant, COD) => {
    try {
      if (COD) {
        await postOrderData({ ...data, COD: true });
        navigate("/Success"); // Navigate to success page for COD
        return;
      } else {

        const resData = await postOrderData(data);
        if (resData.data) {
          // eSewa v2 API endpoint
          const path = "https://rc-epay.esewa.com.np/api/epay/main/v2/form";

          // Calculate amounts
          const amount = resData.data.totalPrice - 100; // Product amount
          const tax_amount = 0; // Tax amount
          const product_service_charge = 0; // Service charge
          const product_delivery_charge = 100; // Delivery charge
          const total_amount = resData.data.totalPrice; // Total amount
          const transaction_uuid = resData.data?._id; // Unique transaction ID
          const product_code = "EPAYTEST"; // Your merchant code

          // Create signature message (order matters!)
          const message = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
          const signature = generateEsewaSignature(message);

          let params = {
            amount: amount,
            tax_amount: tax_amount,
            total_amount: total_amount,
            transaction_uuid: transaction_uuid,
            product_code: product_code,
            product_service_charge: product_service_charge,
            product_delivery_charge: product_delivery_charge,
            success_url: "http://localhost:3000/esewa_payment_success",
            failure_url: "http://localhost:3000/esewa_payment_failed",
            signed_field_names: "total_amount,transaction_uuid,product_code",
            signature: signature,
          };

          PaymentPostV2(path, params);
        } else {
          throw new Error("Failed to create order");
        }

        setRender((p) => !p);
        if (!instant) {
          setTimeout(() => {
            setOrderData([]);
          }, 3000);
        }
      }

    } catch (error) {
      console.error("Error processing order:", error);
    }
  };

  const finalOrder = async (data, COD) => {
    if (!COD) {
      if (isOrderNow) {
        let finaldata = { ...data, products: orderNowData };
        setFinalPostData(finaldata);
        finalOrderDeliver(finaldata, true, false);
      } else {
        if (data.products[0]) {
          setFinalPostData(data);
          finalOrderDeliver(data, false, false);
        }
      }
    } else {
      if (isOrderNow) {
        let finaldata = { ...data, products: orderNowData };
        setFinalPostData(finaldata);
        finalOrderDeliver(finaldata, true, true);
      } else {
        if (data.products[0]) {
          setFinalPostData(data);
          finalOrderDeliver(data, false, true);
        }
      }
    }
  };

  return (
    <ProductContext.Provider
      value={{
        setOrderData: handleSetOrderData,
        orderData,
        setSummaryData,
        summaryData,
        setUserAddress,
        userAddress,
        postOrderAddresses,
        setRender,
        alluserAddress,
        finalOrder,
        finalPostData,
        userOrderData,
        setIsOrderNow,
        isOrderNow,
        setOrderNowData,
        setCheckoutPop,
        checkoutPop,
        updateOrderBilling,
        deleteOrder,
      }}
    >
      {props.children}
    </ProductContext.Provider>
  );
};

export default ProductState;
