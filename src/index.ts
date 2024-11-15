import { ethers } from 'ethers';

const BASE_URL = 'https://api.openweathermap.org/';
const LOCATION = 'Tokyo';
const API_KEY = 'OPENWEATHERMAP_API_KEY_HERE';
const WEATHERMAN_PK = 'WEATHERMAN_PRIVATE_KEY_HERE';
// Contract Addresses
const CONTRACT_ADDRESS = '';
// RPC URL
const RPC_URL = '';

// Updated enum to match Solidity contract
enum Weather {
  CLEAR,
  CLOUDS,
  SNOW,
  RAIN,
  DRIZZLE,
  THUNDERSTORM
}

declare const _STD_: any;

if (typeof _STD_ === "undefined") {
  console.log("Running in local environment");
  (global as any)._STD_ = {
    app_info: { version: "local" },
    job: { getId: () => "local" },
    device: { getAddress: () => "local" },
  };
}

async function getWeatherData() {
  const response = await fetch(`${BASE_URL}data/2.5/weather?q=${LOCATION}&appid=${API_KEY}`);
  const data = await response.json();
  const condition = data["weather"][0]["main"];
  console.log(`Weather condition in ${LOCATION}: ${condition}`);
  return condition;
}

function weatherConditionToEnum(condition: string): Weather {
  switch (condition.toUpperCase()) {
    case 'CLEAR':
      return Weather.CLEAR;
    case 'CLOUDS':
      return Weather.CLOUDS;
    case 'SNOW':
      return Weather.SNOW;
    case 'RAIN':
      return Weather.RAIN;
    case 'DRIZZLE':
      return Weather.DRIZZLE;
    case 'THUNDERSTORM':
      return Weather.THUNDERSTORM;
    default:
      console.warn(`Unknown weather condition: ${condition}. Defaulting to CLEAR.`);
      return Weather.CLEAR;
  }
}

async function callWeatherChange(weatherCondition: Weather) {
  // Connect to the blockchain network (replace with your preferred provider URL)
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Create a wallet instance
  const wallet = new ethers.Wallet(WEATHERMAN_PK, provider);

  // Create a contract instance
  const contractABI = [
    "function setWeather(uint8 newWeather) external",
    "event WeatherChanged(uint8 newWeather)"
  ];
  const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

  console.log("Calling setWeather function...");
  try {
    const tx = await contract.setWeather(weatherCondition);
    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);

    // Check for the WeatherChanged event
    const weatherChangedEvent = receipt.logs.find(
      (log: any) => log.topics[0] === ethers.id("WeatherChanged(uint8)")
    );
    if (weatherChangedEvent) {
      const [newWeather] = ethers.AbiCoder.defaultAbiCoder().decode(['uint8'], weatherChangedEvent.data);
      console.log("New weather set:", Weather[newWeather]);
    }
  } catch (error) {
    console.error("Error calling setWeather:", error);
  }
}

async function fetchAndPostWeatherData() {
  try {
    const condition = await getWeatherData();
    const weatherEnum = weatherConditionToEnum(condition);
    try {
      await callWeatherChange(weatherEnum);
    } catch (error) {
      console.error("Error posting data:", error);
    }
  } catch (error) {
    console.error("Error getting data:", error);
  }
}

fetchAndPostWeatherData();