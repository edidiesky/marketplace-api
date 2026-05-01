"use client";
import React, { useState, useEffect } from "react";
import moment from "moment";
import { MdEdit } from "react-icons/md";
import { BsThreeDots, BsTrash } from "react-icons/bs";
;
import {Link} from "react-router-dom";

const TableCard = ({ tabledata, type, tableheadList }: {
    tabledata?: any, type?: string, tableheadList: string[]
}) => {
    const [userdeletemodal, setUserDeleteModal] = useState(false);
    const startDate = moment(tabledata?.startDate).format("DD MMM YYYY");
    const endDate = moment(tabledata?.endDate).format("DD MMM YYYY");
    if (type === "Applicants") {
        return (

            <table className="table-fixed border-collapse w-full overflow-auto">
                <thead>
                    <tr>
                        {
                            tableheadList?.map((data, index) => {
                                return <th className="text-sm py-6 bg-[#fafafa] px-3 text-[#969A9A] font-normal" key={index}>{data}</th>
                            })
                        }
                    </tr>
                </thead>
                <tbody className="text-sm font-normal">
                    {
                        tabledata?.map((data?: any, _?: any) => {
                            return <tr className="px-4 hover:bg-[#eee] border-b cursor-pointer text-start py-6" key={data?.id}>

                                <td className=" font-normal py-6 text-center">
                                    {/* <img
                                        src={data?.companyImage}
                                        width={50}
                                        height={50}
                                        alt="Comapny's Logo"
                                    /> */}
                                    123-134
                                </td>
                                <td className=" space-x-3  family2 py-6 text-center">
                                    <div className="flex justify-center items-center gap-3">
                                        <img
                                            src={data?.applicantImage}
                                            width={45}
                                            height={45}
                                            className='rounded-full'
                                            alt="Comapny's Logo"
                                        />
                                        {data?.applicantName}
                                    </div>
                                </td>
                                <td className=" font-normal py-6 text-center">
                                    {data?.jobtitle}
                                </td>
                                <td className=" font-normal py-6 text-center">
                                    {/* {data?.jobtitle} */} 24th October
                                </td>
                                {/* <td className=" font-normal py-6 text-center">24th Ocotber 2024</td> */}

                                <td className="py-6 text-center">
                                    {data?.ApplicationStatus === "HIRED" ? (
                                        <span className="py-2 family2 px-4 rounded-md bg-[#cdeed3] text-[#347345] text-xs family1 success text-center">
                                            {data?.ApplicationStatus}
                                        </span>
                                    ) : data?.ApplicationStatus === "ACTIVE" ? (
                                        <span className="py-2 family2 px-4 rounded-md bg-[#ffeec3] text-[#a37d18] text-xs family1 success text-center">
                                            {data?.ApplicationStatus}
                                        </span>
                                    ) :

                                        (
                                            <span className="py-2 font-normal px-4 rounded-md bg-[#deddff] text-[#3e3aff] text-xs family1 danger text-center">
                                                {data?.ApplicationStatus}
                                            </span>
                                        )}
                                </td>
                                <td className=" font-normal py-6 text-center">
                                    <div className="w-full flex items-center  justify-center">
                                        <div className="w-10 h-10 rounded-full hover:bg-[#deddff] flex justify-center items-center">
                                            <BsTrash color={"#c31212"} />
                                        </div>
                                        <div className="w-10 h-10 rounded-full hover:bg-[#deddff] flex justify-center items-center">
                                            <MdEdit color={"#347345"} />
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        })
                    }

                </tbody>
            </table>

        );
    }
    return (

        <table className="table-fixed w-full border-collapse overflow-auto">
            <thead>
                <tr>
                    {
                        tableheadList?.map((data, index) => {
                            return <th className="text-sm py-8 bg-[#fafafa] px-3 text-[#969A9A] font-normal" key={index}>{data}</th>
                        })
                    }
                </tr>
            </thead>
            <tbody className="text-sm font-normal">
                {
                    tabledata?.map((data?: any, _?: any) => {
                        return <tr className="px-4 border-b hover:bg-[#eee] cursor-pointer text-start py-6" key={data?.id}>

                            <td className=" font-normal py-6 flex items-center justify-center text-center">
                                <img
                                    src={data?.companyImage}
                                    width={50}
                                    height={50}
                                    alt="Comapny's Logo"
                                />
                            </td>
                            <td className="text-base family2 py-6 text-center">{data?.company}
                            </td>
                            <td className=" font-normal py-6 text-center">   {data?.jobtitle} </td>

                            <td className="py-6 text-center">
                                24th October 2024
                            </td>
                            <td className=" font-normal py-6 text-center">
                                <Link href="user/applied-jobs" className="shadows text-xs px-3 py-3 border rounded-md bg-[#fafafa]">
                                    View Application
                                </Link>
                            </td>
                            <td className=" family2 py-6 text-center">
                                <div className="w-full flex items-center  justify-center">
                                    <div className="w-10 h-10 rounded-full hover:bg-[#deddff] flex justify-center items-center">
                                        <BsTrash color={"#c31212"} />
                                    </div>
                                    <div className="w-10 h-10 rounded-full hover:bg-[#deddff] flex justify-center items-center">
                                        <MdEdit color={"#347345"} />
                                    </div>
                                </div>
                            </td>
                        </tr>
                    })
                }

            </tbody>
        </table>

    );
};

export default TableCard;
