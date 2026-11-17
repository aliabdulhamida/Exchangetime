'use client';

import { useState } from 'react';

import { downloadCsv } from '@/lib/csv-export';
import { breakEven, loanRepayment } from '@/lib/planning-tools';

function Amount({
  label,
  value,
  change,
  required = true,
  step = 'any',
}: {
  label: string;
  value: string;
  change(value: string): void;
  required?: boolean;
  step?: string;
}) {
  return (
    <label className="planner-field">
      {label}
      <input
        type="number"
        min="0"
        step={step}
        value={value}
        required={required}
        onChange={(event) => change(event.target.value)}
        placeholder={required ? 'Enter value' : 'Optional · 0'}
      />
    </label>
  );
}

function Results({
  title,
  values,
  note,
}: {
  title: string;
  values?: [string, string][];
  note: string;
}) {
  return (
    <section className="planner-result" aria-live="polite">
      <h2>{title}</h2>
      {values ? (
        <dl>
          {values.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>Enter valid values to calculate a result.</p>
      )}
      <details className="data-details">
        <summary>Calculation assumptions</summary>
        <p>{note}</p>
      </details>
    </section>
  );
}
const number = (value: number, digits = 2) =>
  value.toLocaleString(undefined, { maximumFractionDigits: digits });

export function LoanPlanner() {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [months, setMonths] = useState('');
  const [extra, setExtra] = useState('');
  const result = rate.trim()
    ? loanRepayment(Number(principal), Number(rate), Number(months), Number(extra))
    : null;
  return (
    <div className="planner-layout">
      <section>
        <h2>Loan terms</h2>
        <p>Enter amounts in the same currency.</p>
        <div className="planner-fields">
          <Amount label="Outstanding balance" value={principal} change={setPrincipal} />
          <Amount label="Fixed annual interest (%)" value={rate} change={setRate} />
          <Amount label="Remaining months (1–600)" value={months} change={setMonths} step="1" />
          <Amount
            label="Extra monthly repayment"
            value={extra}
            change={setExtra}
            required={false}
          />
        </div>
      </section>
      <Results
        title="Repayment plan"
        values={
          result
            ? [
                ['Required monthly payment', number(result.payment)],
                ['Total repaid', number(Number(principal) + result.interest)],
                ['Total interest', number(result.interest)],
                ['Payoff period', result.duration + ' months'],
                ['Time saved', result.monthsSaved + ' months'],
                ['Interest saved', number(result.interestSaved)],
              ]
            : undefined
        }
        note="Monthly installments in arrears. Fixed nominal rate divided by 12; no fees, penalties or rate changes. The last payment is capped at the remaining balance."
      />
      {result && (
        <details className="instrument-observations loan-schedule">
          <summary>Annual repayment schedule</summary>
          <button
            type="button"
            className="terminal-button"
            onClick={() =>
              downloadCsv('loan-repayment.csv', [
                ['Year', 'Principal paid', 'Interest paid', 'Remaining balance'],
                ...result.years.map((year) => [
                  year.year,
                  year.principal,
                  year.interest,
                  year.balance,
                ]),
              ])
            }
          >
            Export schedule
          </button>
          <div
            className="tool-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Annual repayment schedule"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Year</th>
                  <th scope="col">Principal paid</th>
                  <th scope="col">Interest paid</th>
                  <th scope="col">Balance</th>
                </tr>
              </thead>
              <tbody>
                {result.years.map((year) => (
                  <tr key={year.year}>
                    <th scope="row">{year.year}</th>
                    <td>{number(year.principal)}</td>
                    <td>{number(year.interest)}</td>
                    <td>{number(year.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

export function TradeBreakEven() {
  const [shares, setShares] = useState('');
  const [entry, setEntry] = useState('');
  const [buyFee, setBuyFee] = useState('');
  const [sellFee, setSellFee] = useState('');
  const result = breakEven(Number(shares), Number(entry), Number(buyFee), Number(sellFee));
  return (
    <div className="planner-layout">
      <section>
        <h2>Execution costs</h2>
        <p>Enter amounts in the same currency.</p>
        <div className="planner-fields">
          <Amount label="Shares" value={shares} change={setShares} />
          <Amount label="Entry price per share" value={entry} change={setEntry} />
          <Amount label="Total entry fees" value={buyFee} change={setBuyFee} required={false} />
          <Amount label="Total exit fees" value={sellFee} change={setSellFee} required={false} />
        </div>
      </section>
      <Results
        title="Break-even exit"
        values={
          result
            ? [
                ['Price per share', number(result.exitPrice, 6)],
                ['Required price move', number(result.movePct, 4) + '%'],
                ['Initial outlay', number(result.totalCost)],
              ]
            : undefined
        }
        note="Long positions only. Break-even = (entry cost + entry fees + exit fees) ÷ shares. Excludes taxes, spread, slippage and dividends."
      />
    </div>
  );
}
