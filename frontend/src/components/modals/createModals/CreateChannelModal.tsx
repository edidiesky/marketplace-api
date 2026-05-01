"use client";
import React, { useEffect, useState } from "react";

import { motion } from "framer-motion";
import { BiCamera } from "react-icons/bi";
import { RxCross2 } from "react-icons/rx";
import { useSelector, useDispatch } from "react-redux";
import {
  offCreateChannelModal,
  onGroupMemberModal,
} from "@/redux/slices/modalSlice";
import { slide } from "@/constants/framer";
import { useCreateChannelMutation } from "@/redux/services/productApi";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import Loader from "@/components/loader";

const formData = [
  {
    name: "name",
    type: "text",
    placeholder: "Enter your Channel Name (be brief)",
    label: "Channel Name",
  },
  {
    name: "slug",
    type: "text",
    placeholder: "Enter your Channel Slug (be brief)",
    label: "Channel Slug",
  },
  {
    name: "description",
    type: "textarea",
    placeholder: "Enter your channel description",
    label: "Channel Description",
  },
];
const CreateChannelModal = () => {
  const { channelmodal, workspaceid, workspaceUserid } = useSelector(
    (store: any) => store.modal
  );
  const navigate = useNavigate();
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState(false);
  const [formValue, setFormValue] = useState({
    name: "",
    slug: "",
    description: "",
  });
  const dispatch = useDispatch();

  const [
    createChannel,
    { isLoading, data: createdChannel, isSuccess: createChannelIsSuccess },
  ] = useCreateChannelMutation();
  const noEntry = formValue.name === "" || isLoading;
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormValue({ ...formValue, [e.target.name]: e.target.value });
  };
  // submit the create channel form handler
  const handleFormSubmision = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    try {
      const data = await createChannel({ workspaceid, ...formValue }).unwrap();
      console.log("channel_data", data);
      toast.success(`${data?.name} channel has been created succesfully!!`);
    } catch (err: any) {
      const errorMessages = err?.data?.error || [err.error];
      errorMessages.forEach((message: string) => toast.error(message));
      // toast.error(err?.data?.message || err.error);
    }
  };

  // handler for channel icon upload

  const handleFileUpload = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
  };
  // handler for closing channel modal

  const handleOnGroupMembersModal = () => {
    dispatch(offCreateChannelModal(""));
  };

  useEffect(() => {
    if (createChannelIsSuccess && createdChannel) {
      navigate(
        `/workspace/${workspaceid}/${workspaceUserid}/channel/${createdChannel?.id}`
      );
    }
  }, [navigate, createChannelIsSuccess, createdChannel]);

  // console.log("workspaceId", workspaceid);
  // console.log("workspaceUserid", workspaceUserid);
  console.log("createdChannel", createdChannel);
  return (
    <div className="h-[100vh] bg-[#16161639] inset-0 backdrop-blur-sm w-full fixed top-0 left-0 z-[5000] flex items-end lg:items-center justify-end md:justify-center">
      <motion.div
        variants={slide}
        initial="initial"
        animate={channelmodal ? "enter" : "exit"}
        exit={"exit"}
        className="w-full min-h-[80%] md:w-[450px] md:max-w-[500px]  md:min-h-[240px] justify-center pt-8 relative items-start rounded-t-xl md:rounded-[10px] flex flex-col gap-8 bg-white"
      >
        <div
          onClick={() => dispatch(offCreateChannelModal(""))}
          className="absolute top-4 right-4 text-[#000] cursor-pointer w-12 h-12 flex items-center hover:bg-[#fafafa] rounded-full justify-center text-xl"
        >
          <RxCross2 />
        </div>
        <div className="w-full px-6 flex flex-col">
          <h3 className="text-2xl md:text-2xl family2">Create your Channel</h3>
          <span className="block text-sm text-[#777] md:text-sm max-w-[380px]">
            Give your channel a personality by adding an icon and a title, make
            it concise and brief.
          </span>
        </div>
        <form
          onSubmit={handleFormSubmision}
          className="w-full flex flex-col gap-6"
        >
          <div className="w-full px-6 flex items-start flex-col gap-4">
            <div className="w-full flex flex-col gap-1 text-sm">
              <span>Channel Icon</span>
              <div className="w-12 cursor-pointer h-12 bg-[#3e3aff] rounded-full flex items-center justify-center relative">
                <label htmlFor="upload" className="cursor-pointer">
                  <BiCamera className="text-lg lg:text-xl text-[#fff]" />
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
            </div>
            <>
              {formData?.map((form, index) => {
                return (
                  <label
                    key={index}
                    htmlFor="title"
                    className="flex w-full flex-col gap-1 text-sm"
                  >
                    {form.label}
                    <>
                      {form.type === "textarea" ? (
                        <textarea
                          value={formValue[form.name]}
                          name={form.name}
                          onChange={onChange}
                          placeholder={form.placeholder}
                          className="text-sm font-normal resize-none h-[80px] border p-4 w-full bg-white rounded-md"
                        />
                      ) : (
                        <input
                          type={form.type}
                          value={formValue[form.name]}
                          name={form.name}
                          onChange={onChange}
                          placeholder={form.placeholder}
                          className="text-sm font-normal input w-full bg-white rounded-md"
                        />
                      )}
                    </>
                  </label>
                );
              })}
            </>
          </div>
          <div className="w-full pb-3 px-4 pt-4 border-t text-sm flex items-center justify-end gap-3">
            <button
              data-test="create_channel_modal_button_1"
              onClick={() => dispatch(offCreateChannelModal(""))}
              className="p-2 px-6 hover:opacity-[.5] text-[#000] hover:text-[#fff] flex items-center justify-center cursor-pointer hover:bg-[#000] rounded-full regular"
            >
              Cancel
            </button>
            <button
              data-test="create_channel_modal_button_2"
              disabled={noEntry}
              className="p-2 px-6 hover:opacity-[.5] text-[#fff] flex items-center justify-center cursor-pointer  bg-[#3e3aff] rounded-full regular"
            >
              {isLoading ? (
                <span className="flex w-full items-center justify-center gap-2">
                  Creating <Loader type="dots" />
                </span>
              ) : (
                "Create"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateChannelModal;
