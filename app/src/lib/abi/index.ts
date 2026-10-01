import type { Abi } from "viem";

import FlightMarket from "./FlightMarket.json";
import FlightOracleConsumer from "./FlightOracleConsumer.json";
import FlightOracleReceiver from "./FlightOracleReceiver.json";
import FlightRegistry from "./FlightRegistry.json";
import MarketFactory from "./MarketFactory.json";
import MockERC20 from "./MockERC20.json";
import MockFeeder from "./MockFeeder.json";
import OutcomeToken from "./OutcomeToken.json";

export const flightMarketAbi = FlightMarket as unknown as Abi;
export const marketFactoryAbi = MarketFactory as unknown as Abi;
export const flightOracleAbi = FlightOracleConsumer as unknown as Abi;
export const flightOracleReceiverAbi = FlightOracleReceiver as unknown as Abi;
export const flightRegistryAbi = FlightRegistry as unknown as Abi;
export const mockFeederAbi = MockFeeder as unknown as Abi;
export const outcomeTokenAbi = OutcomeToken as unknown as Abi;
export const erc20Abi = MockERC20 as unknown as Abi;
