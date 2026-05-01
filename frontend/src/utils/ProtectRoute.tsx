import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
export const ProtectRoute = ({ children, type }: { children?: React.ReactNode, type?: string }) => {
    // const navigate = useNavigate()
    const { currentUser } = useSelector((store: any) => store.auth);
    // console.log(currentUser.role);
    // if (!currentUser) {
    //     return <Navigate to="/" />;
    // }

    return children;
};