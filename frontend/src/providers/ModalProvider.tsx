"use client"
import React from 'react';
import { AnimatePresence } from "framer-motion";
import LoginModal from '@/components/modals/auth/LoginModal';
import RegisterModal from '@/components/modals/auth/RegisterModal';
import { useSelector } from 'react-redux'

const ModalProvider = () => {
    // const {
    //     loginmodal,
    //     registermodal,
    // } = useSelector((store: { modal?: any }) => store.modal);

    return (
        <>
            {/* animating the login modal */}
            {/* <AnimatePresence mode='wait' >
                {loginmodal && <LoginModal />}
            </AnimatePresence> */}
            {/* animating the register modal */}
            {/* <AnimatePresence mode='wait' >
                {registermodal && <RegisterModal />}
            </AnimatePresence> */}
      
        </>
    );
}


export default ModalProvider;