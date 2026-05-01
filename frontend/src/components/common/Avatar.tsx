import React from "react";

export default function Avatar({ username }: { username: string }) {
  const colors = [
    "#FF5733",
    "#33FF57",
    "#3357FF",
    "#F1C40F",
    "#8E44AD",
    "#2ECC71",
    "#E74C3C",
    "#3498DB",
    "#E67E22",
    "#1ABC9C",
  ];

  const stringToHash = (string: string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const getAvatarColor = (username: string):string =>  {
    const hash = stringToHash(username);
    return colors[hash % colors.length];
  };

  const avatarColor = getAvatarColor(username);
  return (
    <div style={{
        background:`${avatarColor}`
    }} className="w-[45px] h-[45px] rounded-full  flex items-center justify-center text-lg text-white bg-[#35373e41]">
      {username.split("")[0]}
    </div>
  );
}
