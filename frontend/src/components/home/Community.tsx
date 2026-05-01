import React from 'react';
import AnimateTextWord from '@/components/common/AnimateTextWord';

const Community = () => {
    return (
        <div className='flex w-full py-20 items-center  gap-8 justify-center'>
            <div className="max-w-custom mx-auto w-[90%] grid lg:grid-cols-2 lg:items-center gap-12 lg:gap-20">
                <div className="w-full flex flex-col gap-4 lg:items-center justify-between">
                    <h2 className="text-4xl flex-1 lg:text-6xl text-start leading-[1] family2 text-dark family2">
                        <span className="pb-4 block text-xl">
                            <AnimateTextWord type='bigtext'>
                                Top Companies
                            </AnimateTextWord>

                        </span>
                        <AnimateTextWord type='bigtext'>
                            Building your Network: The Job Finder Community
                        </AnimateTextWord>

                    </h2>
                    <div className="flex flex-1 flex-col gap-4">
                        <span className='text-base lg:text-lg font-normal'>
                            <AnimateTextWord>
                                Unlock your true potential and discover a true world of communities that aligns Job Hunting made Easy: Get instant alerts for job matching your skills and innovative job finder!
                            </AnimateTextWord>
                        </span>
                        <span className='flex'>
                            <button className="text-sm lg:text-base px-4 lg:px-6 py-4 border rounded-full text-white bg-[#3e3aff] shadows">Get Started!</button>
                        </span>
                    </div>
                </div>
                <div className="w-full grid lg:grid-cols-2 gap-6">
                    <div className="w-full flex flex-col gap-4">
                        <div className="min-h-[250px] w-full flex relative">
                            <div className="min-h-[100%] z-10 rounded-[20px] w-full bg-[#e8f2fc61] flex p-6 pt-8 flex-col justify-between gap-12">

                                <div className="flex flex-col gap-4">

                                    <h3 className="text-2xl lg:text-3xl leading-[1] family2 text-dark family2">
                                        <AnimateTextWord type='bigtext'>
                                            Jobs In Tech
                                        </AnimateTextWord>
                                      
                                    </h3>
                                    <span className='text-sm lg:text-base font-normal max-w-[500px]'>
                                        <AnimateTextWord>
                                            Many Tech Companies foster innovative and collaborative environments
                                        </AnimateTextWord>
                                        
                                    </span>
                                </div>

                                <span className='flex'>
                                    <button className="text-xs px-4 py-3 border rounded-full text-white bg-[#000] shadows">Get Started!</button>
                                </span>
                            </div>
                        </div>
                        <div className="min-h-[250px] w-full flex relative">
                            <div className="min-h-[100%] z-10 rounded-[20px] w-full bg-[#ffe1cc56] flex p-6 pt-8 flex-col justify-between gap-12">

                                <div className="flex flex-col gap-4">

                                    <h3 className="text-2xl lg:text-3xl leading-[1] family2 text-dark family2">
                                        <AnimateTextWord type='bigtext'>
                                            Designers
                                        </AnimateTextWord>
                                        
                                    </h3>
                                    <span className='text-sm lg:text-base font-normal max-w-[500px]'>
                                        <AnimateTextWord>
                                            Design jobs are all about creating visual components that communicate ideas and vision
                                        </AnimateTextWord>
                                       
                                    </span>
                                </div>

                                <span className='flex'>
                                    <button className="text-xs px-4 py-3 border rounded-full text-white bg-[#000] shadows">Get Started!</button>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="w-full min-h-[250px] flex flex-col gap-4">
                        <div className="min-h-[85%] w-full flex relative">
                            <div className="min-h-[100%] z-10 rounded-[20px] w-full bg-[#e8f2fc61] flex p-6 pt-8 flex-col justify-between gap-12">

                                <div className="flex flex-col gap-4">
                                    <h3 className="text-3xl pb-6 border-b lg:text-4xl leading-[1] family2 text-dark family2">
                                        <AnimateTextWord type='bigtext'>
                                            20k+
                                        </AnimateTextWord>
                                        <span className='text-sm lg:text-base block font-normal max-w-[500px]'>
                                            <AnimateTextWord>
                                            Users joined the community!

                                            </AnimateTextWord>
                                           
                                        </span>
                                    </h3>
                                    <h3 className="text-2xl lg:text-3xl leading-[1] family2 text-dark family2">
                                        <AnimateTextWord type='bigtext'>
                                            Salaries in Tech
                                        </AnimateTextWord>
                                    
                                    </h3>
                                    <span className='text-sm lg:text-base font-normal max-w-[500px]'>
                                        <AnimateTextWord>
                                            Tech salaries are generally quite competitive compared to the average across all occupations.
                                        </AnimateTextWord>
                                   
                                    </span>
                                </div>

                                <span className='flex'>
                                    <button className="text-xs px-4 py-3 border rounded-full text-white bg-[#000] shadows">Get Started!</button>
                                </span>
                            </div>
                        </div>
                        <div className="z-10 rounded-[20px] w-full bg-[#e8f2fc61] flex p-4 items-center justify-center gap-4">
                            <h3 className="text-lg lg:text-xl leading-[1] family2 text-dark text-center w-full family2">
                                More
                            </h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}



export default Community