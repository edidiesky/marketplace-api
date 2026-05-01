import React, { useState, useEffect, useCallback } from "react";
import { Country, State, City } from "country-state-city";
// import Button from "../common/Button";
import { useDispatch, useSelector } from "react-redux";
// import { SaveShippingInformation } from "@/features/auth/authSlice";

const ShippingInformation = () => {
  const dispatch = useDispatch();
  // country, state and city  imported Data
  const countryList = Country.getAllCountries();
  const { shippingInformation } = useSelector((store:any) => store.auth);
  const stateList = State.getAllStates();
  const cityList = City.getAllCities();

  // state country and city input
  const [countryinput, setCountryInput] = React.useState("");
  const [stateinput, setStateInput] = React.useState("");
  const [cityinput, setCityInput] = React.useState("");
  const [zipcode, setZipCode] = React.useState("");
  const noEntry =
    countryinput === "" ||
    stateinput === "" ||
    cityinput === "" ||
    zipcode === "";

  // country state and city data
  const [country, setCountry] = React.useState(null);
  const [state, setState] = React.useState(null);
  const [city, setCity] = React.useState(null);

  // statelist, counytylost and cityData
  const [newcountrylist, setNewCountryList] = React.useState([...countryList]);
  const [statelist, setStateList] = React.useState([]);
  const [citylist, setCityList] = React.useState([]);

  // country modal, statemodal and city modal
  const [countrymodal, setCountryModal] = React.useState(false);
  const [statemodal, setStateModal] = React.useState(false);
  const [citymodal, setCityModal] = React.useState(false);

  // I made use of useCallback hooks have proper dependencies
  // I Ensured only necessary dependencies
  const handleCountryFiltering = useCallback(() => {
    const filteredCountriedList = newcountrylist?.filter((countries) =>
      countries?.name?.toLowerCase()?.includes(countryinput?.toLowerCase())
    );
    let filteredStateList = stateList?.filter(
      (state) => state?.countryCode === country?.isoCode
    );

    setStateList(filteredStateList);
    setNewCountryList(filteredCountriedList);
  }, [countryinput, country]);

  const handleStateFiltering = useCallback(() => {
    const newfilteredStateList = statelist?.filter((statedata) =>
      statedata?.name?.toLowerCase()?.includes(stateinput?.toLowerCase())
    );
    const filteredCityList = cityList?.filter(
      (stateList) =>
        stateList?.stateCode === state?.isoCode &&
        stateList?.countryCode === state?.countryCode
    );

    setCityList(filteredCityList);
    setStateList(newfilteredStateList);
  }, [stateinput, state]);

  const handleCityFiltering = useCallback(() => {
    const filteredCityList = citylist?.filter((citydata) =>
      citydata?.name?.toLowerCase()?.includes(cityinput?.toLowerCase())
    );

    setCityList(filteredCityList);
  }, [cityinput]);

  useEffect(() => {
    // Remove unnecessary dependency variables that cause infinite loops
    if (countryinput || country || state || stateinput) {
      handleCountryFiltering();
    }
    if (stateinput) {
      handleStateFiltering();
    }
    if (cityinput) {
      handleCityFiltering();
    }
    if (countryinput === "") {
      setNewCountryList([...countryList]);
    }
  }, [
    countryinput,
    stateinput,
    country,
    state,
    handleCountryFiltering,
    handleStateFiltering,
    handleCityFiltering,
  ]);
  useEffect(() => {
    if (shippingInformation) {
      setCountry(shippingInformation?.country);
      setState(shippingInformation?.state);
      setCity(shippingInformation?.city);
      setZipCode(shippingInformation?.zipcode);
    }
  }, [shippingInformation, setCity, setState, setCountry, setZipCode]);
  // console.log(citylist);
  // console.log(City.getAllCities()[0]);
  // console.log(city);
  // console.log(newcountrylist);
  // console.log(State.getAllStates()[0]);
  const handleShippingInformation = () => {
    // dispatch(
    //   SaveShippingInformation({
    //     city: city,
    //     country: country,
    //     state: state,
    //     zipcode: zipcode,
    //   })
    // );
  };
  return (
    <div
      //   onClick={() => setCountryModal(false)}
      className="w-full flex flex-col gap-4"
    >
      <h2 className="text-xl font-dashboard_regular md:text-2xl text-dark">
        Shipping information
      </h2>

      <div
        // onClick={() => {
        //   setCityModal(false);
        //   setStateModal(false);
        //   setCountryModal(false);
        // }}
        className="w-full py-4 flex flex-col gap-4"
      >
        <div className="w-full relative">
          <div
            onClick={() => setCountryModal(!countrymodal)}
            className="h-[45px] border text-sm rounded-full px-4 z-[30000] py-2 flex items-center cursor-pointer w-full"
          >
            {countryinput ? country?.name : "Select your country first"}
          </div>
          {countrymodal && (
            <div className="absolute py-2 gap-4 top-[100%] z-[50000000] w-full overflow-hidden border flex flex-col bg-[var(--grey-1)]">
              <input
                value={countryinput}
                name="countryinput"
                onChange={(e) => {
                  // handleCountryData(e);
                  setCountryInput(e.target.value);
                }}
                placeholder="Search for your country"
                className="h-[50px] bg-[#fff] border w-[95%] px-4 mx-auto text-sm font-work_font"
              />
              <div className="flex max-h-[250px] bg-[var(--grey-1)] overflow-auto w-full  flex-col ">
                {newcountrylist?.map((data, index) => {
                  return (
                    <span
                      onClick={() => {
                        setCountry(data);
                        setCountryInput(data?.name);
                        setCountryModal(false);
                      }}
                      key={index}
                      className="text-base cursor-pointer font-work_font font-normal py-3 hover:text-white px-4 hover:bg-[#0073aa]"
                    >
                      {data?.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="w-full grid sm:grid-cols-2 gap-4">
          {/* state */}
          <div className="w-full relative">
            <div
              onClick={() => setStateModal(!statemodal)}
              className="h-[45px] border text-sm rounded-full px-4 flex cursor-pointer items-center py-2 w-full"
            >
              {stateinput ? state?.name : "Select your City"}
            </div>
            {statemodal && (
              <div className="absolute top-[100%] py-2 gap-4 z-[400] w-full overflow-hidden border flex flex-col bg-[var(--grey-1)]">
                <input
                  value={stateinput}
                  name="stateinput"
                  onChange={(e) => {
                    // handleCountryData(e);
                    setStateInput(e.target.value);
                    setStateModal(true);
                  }}
                  placeholder="Search for your State"
                  className="h-[50px] bg-[#fff] px-4 w-[95%] font-work_font mx-auto text-sm"
                />
                <div className="flex max-h-[250px] bg-[var(--grey-1)] overflow-auto w-full  flex-col ">
                  {statelist?.map((data, index) => {
                    return (
                      <span
                        onClick={() => {
                          setState(data);
                          setStateInput(data?.name);
                          setStateModal(false);
                        }}
                        key={index}
                        className="text-base cursor-pointer font-normal py-3 hover:text-white px-4 hover:bg-[#0073aa]"
                      >
                        {data?.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {/* city */}
          <div className="w-full z-[40000] relative">
            <div
              onClick={() => setCityModal(!citymodal)}
              className="h-[45px] text-sm rounded-full border px-4 flex cursor-pointer items-center py-2 w-full"
            >
              {city ? city?.name : "Select your state"}
            </div>
            {citymodal && (
              <div className="absolute top-[100%] py-2 gap-4 z-[400000000] w-full overflow-hidden border flex flex-col bg-[var(--grey-1)]">
                <input
                  value={cityinput}
                  name="cityinput"
                  onChange={(e) => {
                    setCityInput(e.target.value);
                    setCityModal(true);
                  }}
                  placeholder="Search for your City"
                  className="h-[50px] bg-[#fff] px-4 w-[95%] font-work_font mx-auto text-sm"
                />

                <div className="flex max-h-[250px] bg-[var(--grey-1)] overflow-auto w-full  flex-col ">
                  {citylist?.map((data, index) => {
                    return (
                      <span
                        onClick={() => {
                          setCity(data);
                          setCityInput(data?.name);
                          setCityModal(false);
                        }}
                        key={index}
                        className="text-base cursor-pointer font-normal py-3 hover:text-white px-4 hover:bg-[#0073aa]"
                      >
                        {data?.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="w-full grid sm:grid-cols-2 gap-4">
          <input
            value={zipcode}
            name="zipcode"
            onChange={(e) => {
              setZipCode(e.target.value);
            }}
            placeholder="Enter your zipcode"
            className="h-[45px] text-sm rounded-full border px-4 bg-[#fff] w-full"
          />
          <div className="w-full flex items-center">
            <button
              disabled={noEntry}
              onClick={handleShippingInformation}
              className="h-[45px] btn text-sm btn_small"
            >
              <div className="p-1">Save</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingInformation;
