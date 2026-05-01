import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

// #region constants

// #endregion

// #region styled-components

// #endregion

// #region functions

// #endregion

// #region component
const propTypes = {};

const defaultProps = {};

/**
 * 
 */
const ResumePreview = () => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 114 72"
        aria-hidden="true"
        data-testid="ipl-illustration-spot"
      >
        <defs>
          <filter
            id="ipl-illustrations-spot-ihl-useId-profile-one-frontend-8-6"
            x="0%"
            y="0%"
          >
            <feTurbulence
              baseFrequency="2.5"
              numOctaves="4"
              result="noise"
              seed="14"
            ></feTurbulence>
            <feComponentTransfer in="noise" result="opacity">
              <feFuncA slope="0.6" type="linear"></feFuncA>
            </feComponentTransfer>
            <feBlend
              in="opacity"
              in2="SourceGraphic"
              mode="overlay"
              result="blend"
            ></feBlend>
          </filter>
          <filter
            id="ipl-illustrations-spot-ihl-useId-profile-one-frontend-8-5"
            width="17.824"
            height="17.974"
            x="35.296"
            y="20.259"
            color-interpolation-filters="sRGB"
            filterUnits="userSpaceOnUse"
          >
            <feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood>
            <feBlend
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            ></feBlend>
            <feColorMatrix
              in="SourceAlpha"
              result="hardAlpha"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            ></feColorMatrix>
            <feOffset dx="1" dy="1"></feOffset>
            <feGaussianBlur stdDeviation="0.5"></feGaussianBlur>
            <feComposite
              in2="hardAlpha"
              k2="-1"
              k3="1"
              operator="arithmetic"
            ></feComposite>
            <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0"></feColorMatrix>
            <feBlend
              in2="shape"
              result="effect1_innerShadow_4373_3368"
            ></feBlend>
          </filter>
          <filter
            id="ipl-illustrations-spot-ihl-useId-profile-one-frontend-8-4"
            width="17.824"
            height="17.974"
            x="35.296"
            y="20.259"
            color-interpolation-filters="sRGB"
            filterUnits="userSpaceOnUse"
          >
            <feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood>
            <feBlend
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            ></feBlend>
            <feColorMatrix
              in="SourceAlpha"
              result="hardAlpha"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            ></feColorMatrix>
            <feOffset dx="1" dy="1"></feOffset>
            <feGaussianBlur stdDeviation="0.5"></feGaussianBlur>
            <feComposite
              in2="hardAlpha"
              k2="-1"
              k3="1"
              operator="arithmetic"
            ></feComposite>
            <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0"></feColorMatrix>
            <feBlend
              in2="shape"
              result="effect1_innerShadow_4373_3368"
            ></feBlend>
          </filter>
          <linearGradient
            id="ipl-illustrations-spot-ihl-useId-profile-one-frontend-8-3"
            x1="35.3"
            x2="55.616"
            y1="20.266"
            y2="42.798"
            gradientUnits="userSpaceOnUse"
          >
            <stop stop-color="#6792F0"></stop>
            <stop offset="1" stop-color="#164081"></stop>
          </linearGradient>
          <linearGradient
            id="ipl-illustrations-spot-ihl-useId-profile-one-frontend-8-2"
            x1="35.3"
            x2="55.616"
            y1="20.266"
            y2="42.798"
            gradientUnits="userSpaceOnUse"
          >
            <stop stop-color="#6792F0"></stop>
            <stop offset="1" stop-color="#164081"></stop>
          </linearGradient>
          <clipPath id="ipl-illustrations-spot-ihl-useId-profile-one-frontend-8-1">
            <path
              xmlns="http://www.w3.org/2000/svg"
              fill="#fff"
              d="m50.11 8.003 39.422-.432.104 9.575 7.372 1.706 16.348 52.538H0L15.621.025 50.11 8.003z"
            ></path>
          </clipPath>
          <pattern
            id="ipl-illustrations-spot-ihl-useId-profile-one-frontend-8-0"
            width="50"
            height="40"
            x="0"
            y="0"
            patternTransform="scale(.3)"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 0h50v40H0z"
              filter="url(#ipl-illustrations-spot-ihl-useId-profile-one-frontend-8-6)"
            ></path>
          </pattern>
        </defs>
        <g clip-path="url(#ipl-illustrations-spot-ihl-useId-profile-one-frontend-8-1)">
          <path
            fill="#F2C0D5"
            d="M97.008 18.852 15.62.025 0 71.39h113.356L97.008 18.852z"
          ></path>
          <path
            fill="#fff"
            d="M30.724 71.39h58.442c-3.537-11.655-7.563-30.87-8.03-58.883l-56.523-.148s1.95 24.02 3.686 41.397c.693 6.871 1.532 12.71 2.425 17.634z"
          ></path>
          <path
            fill="#164081"
            d="M90.225 71.39h-1.059c-3.537-11.655-7.563-30.87-8.03-58.883l-46.865-.123-.046-4.207 55.307-.606.693 63.82z"
          ></path>
          <path
            fill="#B6D7EE"
            d="m71.343 48.032.135.884-36.16.323a74.399 74.399 0 0 1-.162-1.65l-.011-.128c0-.135-.014-.27-.027-.404l36.026-.337c.063.44.131.878.198 1.312zm1.017 6.204a81.908 81.908 0 0 1-.388-2.195l-36.36.336.02.183c.06.584.119 1.157.167 1.73.007.046.01.091.013.135.004.047.007.093.014.135l36.533-.324zm.814 4.055-36.934.35c.08.742.174 1.47.267 2.197l37.148-.35a64.056 64.056 0 0 1-.347-1.572l-.134-.624z"
          ></path>
          <g filter="url(#ipl-illustrations-spot-ihl-useId-profile-one-frontend-8-5)">
            <path
              fill="url(#ipl-illustrations-spot-ihl-useId-profile-one-frontend-8-3)"
              d="M43.708 37.233c4.646 0 8.413-3.8 8.413-8.487s-3.767-8.487-8.413-8.487c-4.646 0-8.412 3.8-8.412 8.487s3.766 8.487 8.412 8.487z"
            ></path>
          </g>
          <g filter="url(#ipl-illustrations-spot-ihl-useId-profile-one-frontend-8-4)">
            <path
              fill="url(#ipl-illustrations-spot-ihl-useId-profile-one-frontend-8-2)"
              d="M43.708 37.233c4.646 0 8.413-3.8 8.413-8.487s-3.767-8.487-8.413-8.487c-4.646 0-8.412 3.8-8.412 8.487s3.766 8.487 8.412 8.487z"
            ></path>
          </g>
          <path
            fill="#F39E78"
            d="M48.68 35.593a8.326 8.326 0 0 1-4.972 1.64 8.33 8.33 0 0 1-5.01-1.668v-.985c0-1.827 1.69-3.352 3.945-3.719a3.328 3.328 0 0 1-2.25-3.158c0-1.838 1.475-3.328 3.295-3.328 1.82 0 3.297 1.49 3.297 3.328 0 1.47-.943 2.716-2.25 3.158 2.254.366 3.946 1.892 3.946 3.719v1.013z"
          ></path>
        </g>
        <rect
          clip-path="url(#ipl-illustrations-spot-ihl-useId-profile-one-frontend-8-1)"
          width="100%"
          height="100%"
          fill="url(#ipl-illustrations-spot-ihl-useId-profile-one-frontend-8-0)"
          style={{mixBlendMode: "overlay"}}
        ></rect>
      </svg>
    );
}

export default ResumePreview;