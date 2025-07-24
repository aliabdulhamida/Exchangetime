"use client"

import { DollarSign, ArrowLeftRight } from "lucide-react"
// import { SiConvertio } from "react-icons/si"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const currencies = [
	"USD",
	"EUR",
	"JPY",
	"GBP",
	"AUD",
	"CAD",
	"CHF",
	"CNY",
	"NZD",
	"INR",
	"SGD",
	"HKD",
	"SEK",
	"KRW",
	"MXN",
	"BRL",
	"RUB",
	"ZAR",
	"TRY",
	"NOK",
	"DKK",
	"PLN",
	"THB",
	"IDR",
	"AED",
	"SAR",
	"ILS",
	"PHP",
	"MYR",
	"CZK",
	"TND",
	"BHD",
	"KWD",
	"LYD",
	"JOD",
	"IQD",
]

const commonPairs = [
	["EUR", "USD"],
	["USD", "JPY"],
	["GBP", "USD"],
	["USD", "CHF"],
	["EUR", "GBP"],
	["AUD", "USD"],
]

export default function CurrencyConverter() {
	const [amount, setAmount] = useState("1000")
	const [fromCurrency, setFromCurrency] = useState("USD")
	const [toCurrency, setToCurrency] = useState("EUR")
	const [result, setResult] = useState<string | null>(null)
	const [rate, setRate] = useState<number | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [lastUpdated, setLastUpdated] = useState<string | null>(null)

	const handleConvert = async (e?: React.FormEvent) => {
		if (e) e.preventDefault()
		setLoading(true)
		setError(null)
		setResult(null)
		setRate(null)
		try {
			const amt = parseFloat(amount)
			if (isNaN(amt) || amt <= 0)
				throw new Error("Please enter a valid positive amount")
			if (fromCurrency === toCurrency)
				throw new Error("Please select different currencies for conversion")
			const symbol = `${fromCurrency}${toCurrency}=X`
			const proxyUrl = "https://corsproxy.io/?"
			const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
			const url = proxyUrl + encodeURIComponent(yahooUrl)
			const response = await fetch(url)
			const data = await response.json()
			if (data.chart && data.chart.result && data.chart.result[0]) {
				const rateVal = data.chart.result[0].meta.regularMarketPrice
				setRate(rateVal)
				setResult((amt * rateVal).toFixed(2))
				setLastUpdated(new Date().toLocaleString())
			} else {
				throw new Error("Exchange rate not available")
			}
		} catch (err: any) {
			setError(err.message || "Unknown error")
		} finally {
			setLoading(false)
		}
	}

	const swapCurrencies = () => {
		setFromCurrency(toCurrency)
		setToCurrency(fromCurrency)
		setResult(null)
		setRate(null)
		setError(null)
	}

	return (
		<div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
			<h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
				<DollarSign className="w-5 h-5" />
				Currency Converter
			</h2>
			<form className="space-y-4" onSubmit={handleConvert}>
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Amount
					</label>
					<Input
						type="number"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						placeholder="Enter amount"
					/>
				</div>
				<div className="flex items-center gap-4">
					<div className="flex-1">
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							From
						</label>
						<select
							value={fromCurrency}
							onChange={(e) => setFromCurrency(e.target.value)}
							className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#1F1F23] text-gray-900 dark:text-white"
						>
							{currencies.map((currency) => (
								<option key={currency} value={currency}>
									{currency}
								</option>
							))}
						</select>
					</div>
					<Button
						variant="outline"
						size="sm"
						type="button"
						onClick={swapCurrencies}
						className="mt-6 bg-transparent"
						aria-label="Swap currencies"
					>
						<ArrowLeftRight className="w-5 h-5" />
					</Button>
					<div className="flex-1">
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							To
						</label>
						<select
							value={toCurrency}
							onChange={(e) => setToCurrency(e.target.value)}
							className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#1F1F23] text-gray-900 dark:text-white"
						>
							{currencies.map((currency) => (
								<option key={currency} value={currency}>
									{currency}
								</option>
							))}
						</select>
					</div>
				</div>
				<div className="mb-2">
					<p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
						Common pairs:
					</p>
					<div className="flex flex-wrap gap-2">
						{commonPairs.map(([from, to]) => (
							<Button
								key={from + to}
								type="button"
								size="sm"
								variant="outline"
								onClick={() => {
									setFromCurrency(from)
									setToCurrency(to)
									setResult(null)
									setRate(null)
									setError(null)
								}}
							>
								{from}/{to}
							</Button>
						))}
					</div>
				</div>
				<Button type="submit" className="w-full flex items-center justify-center gap-2" disabled={loading}>
					<i className="bi bi-arrow-repeat text-lg" />
					{loading ? "Loading..." : "Convert"}
				</Button>
			</form>
			{error && <div className="text-red-500 mt-4">{error}</div>}
			{result && rate !== null && (
				<div className="p-4 rounded-lg bg-gray-50 dark:bg-[#1F1F23] text-center mt-4">
					<p className="text-sm text-gray-600 dark:text-gray-400">Result</p>
					<p className="text-2xl font-bold text-gray-900 dark:text-white">
						{result} {toCurrency}
					</p>
					<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
						1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
					</p>
					<p className="text-xs text-gray-400 mt-1">
						Last updated: {lastUpdated}
					</p>
				</div>
			)}
		</div>
	)
}
