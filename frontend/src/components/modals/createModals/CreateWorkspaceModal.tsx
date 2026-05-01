"use client";
import React, { useState } from "react";

import { motion } from "framer-motion";
import { BiCamera } from "react-icons/bi";
import { RxCross2 } from "react-icons/rx";
import { useSelector, useDispatch } from "react-redux";
import {
  offGroupNameModal,
  onGroupMemberModal,
} from "@/redux/slices/modalSlice";
import { slide } from "@/constants/framer";

const CreateWorkspaceModal = () => {
  const { groupnamemodal } = useSelector(
    (store: { modal: { groupnamemodal: boolean } }) => store.modal
  );
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState(false);
  const [formValue, setFormValue] = useState({
    name: "",
  });

  const dispatch = useDispatch();
  const noEntry = formValue.name === "";
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormValue({ ...formValue, [e.target.name]: e.target.value });
  };
  const handleFormSubmision = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
  };

  const handleFileUpload = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
  };
  const handleOnGroupMembersModal = () => {
    dispatch(offGroupNameModal(""));
    dispatch(onGroupMemberModal(""));
  };
  return (
    <div className="h-[100vh] bg-[#16161639] inset-0 backdrop-blur-sm w-full fixed top-0 left-0 z-[5000] flex items-end lg:items-center justify-end md:justify-center">
      <motion.div
        variants={slide}
        initial="initial"
        animate={groupnamemodal ? "enter" : "exit"}
        exit={"exit"}
        className="w-full min-h-[80%] md:w-[450px] md:max-w-[500px]  md:min-h-[240px] justify-center pt-8 relative items-start rounded-t-xl md:rounded-[10px] flex flex-col gap-8 bg-white"
      >
        
        <div
          onClick={() => dispatch(offGroupNameModal(""))}
          className="absolute top-4 right-4 text-[#000] cursor-pointer w-12 h-12 flex items-center hover:bg-[#fafafa] rounded-full justify-center text-xl"
        >
          <RxCross2 />
        </div>
        <div className="w-full px-6 flex flex-col">
          <h3 className="text-2xl md:text-3xl family2">
            Create your Workspace
          </h3>
          <span className="block text-sm text-[#777] md:text-base max-w-[350px]">
            Give your workspace a personality by adding an icon and a title,
            make it concise and brief.
          </span>
        </div>
        <form
          onSubmit={handleFormSubmision}
          className="w-full flex flex-col gap-6"
        >
          <div className="w-full px-6 flex items-center gap-4">
            <div className="w-16 cursor-pointer h-16 bg-[#3e3aff] rounded-full flex items-center justify-center relative">
              <label htmlFor="upload" className="cursor-pointer">
                <BiCamera className="text-xl lg:text-2xl text-[#fff]" />
                <input
                  type="file"
                  id="upload"
                  placeholder="Gigimg"
                  autoComplete="off"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                  multiple
                  className="w-full"
                />
              </label>
            </div>
            <input
              type={"text"}
              value={formValue.name}
              name={"name"}
              onChange={(e) => onChange(e)}
              placeholder={"Enter your Workspace Name (be brief)"}
              className="text-sm font-normal input bg-white rounded-full flex-1 "
            />
          </div>
          <div className="w-full pb-4 px-4 pt-4 border-t text-sm flex items-center justify-end gap-3">
            <button
              data-test="GroupNameModal_button_1"
              onClick={() => dispatch(offGroupNameModal(""))}
              className="p-2 px-6 text-[#000] flex items-center justify-center cursor-pointer hover:bg-[#f5f5f5] rounded-full regular"
            >
              Cancel
            </button>
            <button
              data-test="GroupNameModal_button_2"
              disabled={noEntry}
              onClick={handleOnGroupMembersModal}
              className="p-2 px-6 text-[#fff] flex items-center justify-center cursor-pointer  bg-[#3e3aff] rounded-full regular"
            >
              Create
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateWorkspaceModal;
